/**
 * PulseTrader+ — Express Server
 *
 * HTTP + WebSocket server that exposes:
 *  - POST /api/chat          — AI agent chat endpoint
 *  - GET  /api/agent         — Agent wallet info
 *  - GET  /api/balances      — Token balances
 *  - GET  /api/quote         — Swap quote
 *  - POST /api/swap          — Direct swap execution
 *  - GET  /api/health        — Health check
 *  - WS   /ws                — Real-time Flashblock updates
 */
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";

dotenv.config();

import { handleChat, resetSession, setDCACallback } from "./agent";
import {
  getSwapQuote,
  executeSwap,
  getAllBalances,
  getAgentInfo,
  refreshPrices,
  getCurrentPrices,
} from "./onchain";
import { config, agentAccount, walletClient } from "./chain";
import { flashblocksWs, type BlockUpdate } from "./flashblocks";
import { onchainOS, healthCheck as onchainOSHealthCheck, getUniswapPools, getTokenLiquidity } from "./onchainos-mcp";
import {
  getMarketOverview,
  getPoolStats,
  getTradeHistory,
  getEconomyLoop,
  checkFeeSweep,
  checkFeeReinvest,
  getFeeTreasuryStatus,
  generateAISignal,
} from "./analytics";
import {
  x402Gate,
  processPayment,
  getPricingInfo,
  getX402Status,
} from "./x402";
import {
  startRebalancer,
  stopRebalancer,
  getRebalancerStatus,
  setRebalanceCallback,
} from "./rebalancer";

const app = express();

// CORS: allow Vercel production domain + localhost dev
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:3001"];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Also allow any *.vercel.app subdomain
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// Handle BigInt serialization in JSON responses
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value
);

const PORT = parseInt(process.env.PORT || "3001", 10);

// ---------------------------------------------------------------------------
// HTTP Routes
// ---------------------------------------------------------------------------

/** Root route — quick proof-of-life for browsers / uptime monitors */
app.get("/", (_req, res) => {
  res.json({
    name: "PulseTrader+",
    version: "1.0.0",
    description: "Autonomous AI Trading Agent on X Layer",
    docs: "GET /api/health for full status",
  });
});

/** Health check */
app.get("/api/health", (_req, res) => {
  const rbStatus = getRebalancerStatus();
  res.json({
    status: "ok",
    agent: agentAccount?.address || null,
    chain: "X Layer Testnet (1952)",
    flashblocksConnected: flashblocksWs.isConnected(),
    onchainosConnected: onchainOS.isReady(),
    rebalancerRunning: rbStatus.running,
    rebalanceCount: rbStatus.rebalanceCount,
    builderCode: config.builderCode,
    timestamp: new Date().toISOString(),
  });
});

/** Live token prices from OnchainOS */
app.get("/api/prices", (_req, res) => {
  res.json({ prices: getCurrentPrices(), source: "onchainos" });
});

/** Rebalancer status + recent events */
app.get("/api/rebalancer/status", (_req, res) => {
  res.json(getRebalancerStatus());
});

/** Fee treasury status — economy loop proof */
app.get("/api/treasury/status", (_req, res) => {
  res.json(getFeeTreasuryStatus());
});

/** Public trade history (last 20) — NOT x402 gated */
app.get("/api/trades", (_req, res) => {
  try {
    const limit = parseInt((_req.query.limit as string) || "20", 10);
    const data = getTradeHistory(limit);
    res.json({ trades: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** OnchainOS live health check — verifies the MCP bridge returns real data */
app.get("/api/onchainos/status", async (_req, res) => {
  try {
    const status = await onchainOSHealthCheck();
    res.json({
      connected: onchainOS.isReady(),
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      connected: onchainOS.isReady(),
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/** Uniswap / DeFi pool search via OnchainOS */
app.get("/api/onchainos/uniswap-pools", async (req, res) => {
  try {
    const query = (req.query.query as string) || "ETH";
    const chain = (req.query.chain as string) || "xlayer";
    const pools = await getUniswapPools(query, chain);
    res.json({ pools });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Token liquidity pools via OnchainOS */
app.get("/api/onchainos/token-liquidity", async (req, res) => {
  try {
    const address = req.query.address as string;
    const chain = (req.query.chain as string) || "xlayer";
    if (!address) return res.status(400).json({ error: "Missing query param: address" });
    const liquidity = await getTokenLiquidity(address, chain);
    res.json({ liquidity });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Agent info (wallet address, balances, chain) */
app.get("/api/agent", async (_req, res) => {
  try {
    const info = await getAgentInfo();
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Token balances */
app.get("/api/balances", async (_req, res) => {
  try {
    if (!agentAccount) {
      return res.status(500).json({ error: "Agent wallet not configured" });
    }
    const balances = await getAllBalances(agentAccount.address);
    res.json({ address: agentAccount.address, balances });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Swap quote */
app.get("/api/quote", (req, res) => {
  try {
    const { from, to, amount } = req.query;
    if (!from || !to || !amount) {
      return res
        .status(400)
        .json({ error: "Missing params: from, to, amount" });
    }
    const quote = getSwapQuote(
      from as string,
      to as string,
      parseFloat(amount as string)
    );
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** Direct swap execution */
app.post("/api/swap", async (req, res) => {
  try {
    const { fromToken, toToken, amount } = req.body;
    if (!fromToken || !toToken || !amount) {
      return res
        .status(400)
        .json({ error: "Missing body params: fromToken, toToken, amount" });
    }
    const result = await executeSwap(fromToken, toToken, amount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Chat with the AI agent */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing body param: message" });
    }

    console.log(`💬 [${sessionId}] User: ${message}`);
    const result = await handleChat(sessionId, message);
    console.log(`🤖 [${sessionId}] Agent: ${result.reply.substring(0, 100)}...`);

    res.json({ reply: result.reply, toolCalls: result.toolCalls, sessionId });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

/** Reset conversation */
app.post("/api/reset", (req, res) => {
  const { sessionId = "default" } = req.body;
  resetSession(sessionId);
  res.json({ status: "reset", sessionId });
});

// ---------------------------------------------------------------------------
// x402 Payment Endpoints
// ---------------------------------------------------------------------------

/** x402 pricing info — free endpoint showing what's available */
app.get("/api/x402/pricing", (_req, res) => {
  res.json(getPricingInfo());
});

/** x402 payment status */
app.get("/api/x402/status", (_req, res) => {
  res.json(getX402Status());
});

/** x402 pay — create a payment session for premium analytics */
app.post("/api/x402/pay", async (req, res) => {
  try {
    const { resource, mode = "demo", txHash } = req.body;
    if (!resource) {
      return res
        .status(400)
        .json({ error: "Missing body param: resource" });
    }

    const result = await processPayment(resource, mode, txHash);
    res.json({
      status: "paid",
      sessionId: result.session.id,
      ...result.paymentInfo,
      expiresAt: new Date(result.session.expiresAt).toISOString(),
      instructions: 'Include "X-Payment-Session: <sessionId>" header in analytics requests',
    });
  } catch (err: any) {
    res.status(402).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Premium Analytics Endpoints (x402 gated)
// ---------------------------------------------------------------------------

/** Market overview — token prices + gas (x402 gated) */
app.get("/api/analytics/market-overview", x402Gate("market-overview"), async (_req, res) => {
  try {
    const data = await getMarketOverview();
    res.json({ premium: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Pool statistics — TVL, volume, APY (x402 gated) */
app.get("/api/analytics/pool-stats", x402Gate("pool-stats"), async (_req, res) => {
  try {
    const data = await getPoolStats();
    res.json({ premium: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Trade history — recent agent trades (x402 gated) */
app.get("/api/analytics/trade-history", x402Gate("trade-history"), async (_req, res) => {
  try {
    const limit = parseInt((_req.query.limit as string) || "20", 10);
    const data = await getTradeHistory(limit);
    res.json({ premium: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Economy loop dashboard — agent revenue & activity (x402 gated) */
app.get("/api/analytics/economy-loop", x402Gate("economy-loop"), async (_req, res) => {
  try {
    const data = await getEconomyLoop();
    res.json({ premium: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** AI Trading Signal — agent charges for its own intelligence (x402 gated) */
app.get("/api/analytics/ai-signal", x402Gate("ai-signal"), async (_req, res) => {
  try {
    const data = await generateAISignal();
    res.json({ premium: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Full Analytics — all premium data in one aggregated response (x402 gated) */
app.get("/api/analytics/full-analytics", x402Gate("full-analytics"), async (_req, res) => {
  try {
    const [marketOverview, poolStats, tradeHistoryData, economyLoop, aiSignal] =
      await Promise.all([
        getMarketOverview(),
        getPoolStats(),
        getTradeHistory(15),
        getEconomyLoop(),
        generateAISignal(),
      ]);
    res.json({
      premium: true,
      bundle: "full-analytics",
      data: { marketOverview, poolStats, tradeHistory: tradeHistoryData, economyLoop, aiSignal },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// WebSocket Server (real-time updates)
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const wsClients: Set<WebSocket> = new Set();

wss.on("connection", (ws) => {
  wsClients.add(ws);
  console.log(`🔗 WS client connected (total: ${wsClients.size})`);

  // Send initial agent info
  ws.send(
    JSON.stringify({
      type: "connected",
      agent: agentAccount?.address,
      chain: "X Layer Testnet (1952)",
    })
  );

  ws.on("close", () => {
    wsClients.delete(ws);
    console.log(`🔌 WS client disconnected (total: ${wsClients.size})`);
  });
});

/** Broadcast a message to all connected WS clients */
function broadcast(data: object): void {
  const msg = JSON.stringify(data);
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Forward Flashblock updates to all WS clients
flashblocksWs.onBlock((update: BlockUpdate) => {
  broadcast(update);
});

// Forward DCA execution updates to all WS clients
setDCACallback((dcaId, result) => {
  broadcast({
    type: "dcaExecution",
    dcaId,
    ...result,
  });
});

// Forward Rebalancer events to all WS clients
setRebalanceCallback((event) => {
  broadcast({
    type: "rebalance",
    ...event,
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

(async () => {
  // Initialize OnchainOS MCP client
  try {
    await onchainOS.connect();
    console.log("✅ OnchainOS MCP client initialized");

    // Live health check — verify real data flows through
    const hc = await onchainOSHealthCheck();
    if (hc.ok) {
      console.log(`✅ OnchainOS health check passed (${hc.latencyMs}ms) — sample:`, JSON.stringify(hc.sample));
    } else {
      console.warn(`⚠️  OnchainOS health check failed: ${hc.error}`);
    }

    // Fetch live prices from OnchainOS
    await refreshPrices();
    console.log("✅ Live prices loaded:", JSON.stringify(getCurrentPrices()));

    // Refresh prices every 60 seconds
    setInterval(async () => {
      try { await refreshPrices(); } catch {}
      // Economy loop: sweep fees to treasury + reinvest via auto-DCA
      try { await checkFeeSweep(); } catch {}
      try { await checkFeeReinvest(); } catch {}
    }, 60_000);

    // Start autonomous rebalancer
    startRebalancer();

    // Heartbeat: periodic self-transfer with Builder Code to prove agent liveness
    let heartbeatCount = 0;
    setInterval(async () => {
      if (!agentAccount || !walletClient) return;
      try {
        const tx = await walletClient.sendTransaction({
          account: agentAccount,
          to: agentAccount.address,
          value: 0n,
          chain: null,
        });
        heartbeatCount++;
        console.log(`💓 Heartbeat #${heartbeatCount} (tx: ${tx.slice(0, 18)}...)`);
        broadcast({ type: "heartbeat", txHash: tx, count: heartbeatCount, timestamp: Date.now() });
      } catch (err: any) {
        console.warn(`💓 Heartbeat failed: ${err.message}`);
      }
    }, 5 * 60_000); // Every 5 minutes
  } catch (err) {
    console.warn("⚠️  OnchainOS MCP client failed to initialize (skills will be unavailable):", err);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 PulseTrader+ Backend Server");
    console.log("=".repeat(60));
    console.log(`Server:        http://localhost:${PORT}`);
    console.log(`WebSocket:     ws://localhost:${PORT}/ws`);
    console.log(`Agent Wallet:  ${agentAccount?.address || "NOT SET"}`);
    console.log(`Chain:         X Layer Testnet (1952)`);
    console.log(`RPC:           ${config.rpcUrl}`);
    console.log(`Flashblocks:   ${config.flashblocksRpc}`);
    console.log(`Builder Code:  ${config.builderCode}`);
    console.log(`LLM:           Multi-provider failover (Groq → Cerebras → Gemini)`);
    console.log(`OnchainOS:     ${onchainOS.isReady() ? "✅ Connected" : "❌ Unavailable"}`);
    console.log(`x402 Gate:     ✅ Active (6 premium endpoints)`);
    console.log(`Rebalancer:    ✅ Autonomous (60s interval, PWETH>55%/PUSDC>60%)`);
    console.log(`Prices:        ✅ Live from OnchainOS (60s refresh)`);
    console.log(`PUSDC:         ${config.pusdcAddress || "NOT DEPLOYED"}`);
    console.log(`PWETH:         ${config.pwethAddress || "NOT DEPLOYED"}`);
    console.log("=".repeat(60));
    console.log("\n📊 Premium Analytics (x402 gated):");
    console.log("   /api/analytics/market-overview  — 0.50 PUSDC");
    console.log("   /api/analytics/pool-stats       — 1.00 PUSDC");
    console.log("   /api/analytics/trade-history    — 0.25 PUSDC");
    console.log("   /api/analytics/economy-loop     — 0.50 PUSDC");
    console.log("   /api/analytics/ai-signal        — 2.00 PUSDC (AI intelligence)");
    console.log("   /api/analytics/full-analytics   — 2.50 PUSDC (all-in-one bundle)");
    console.log("   /api/x402/pricing               — FREE (info)");
    console.log("   /api/x402/pay                   — Payment endpoint");
    console.log("   /api/treasury/status             — Fee treasury dashboard");
    console.log("");
    console.log("🔌 OnchainOS Endpoints:");
    console.log("   /api/onchainos/status            — Live health check");
    console.log("   /api/onchainos/uniswap-pools     — DeFi pool search");
    console.log("   /api/onchainos/token-liquidity    — Token liquidity data");
    console.log("=".repeat(60));

    // Connect to Flashblocks WebSocket
    flashblocksWs.connect();
  });
})();

// Graceful shutdown
function shutdown() {
  console.log("\n🛑 Shutting down PulseTrader+...");
  onchainOS.disconnect();
  flashblocksWs.disconnect();
  stopRebalancer();
  server.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
