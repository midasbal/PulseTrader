/**
 * PulseTrader+ MCP Server
 *
 * Exposes the agent's trading capabilities as MCP (Model Context Protocol) tools,
 * making PulseTrader+ composable with other AI agents (Claude Desktop, etc.).
 *
 * Transport: stdio (JSON-RPC over stdin/stdout)
 *
 * Tools exposed:
 *   - pulsetrader_swap         Execute a token swap on X Layer
 *   - pulsetrader_quote        Get a price quote before swapping
 *   - pulsetrader_balance      Check agent wallet balances
 *   - pulsetrader_dca_create   Set up a Dollar-Cost Averaging schedule
 *   - pulsetrader_dca_status   Check or manage DCA schedules
 *   - pulsetrader_market_price Get real-time token price via OnchainOS
 *   - pulsetrader_search_token Search for tokens across 20+ chains
 *   - pulsetrader_agent_info   Get agent wallet info and capabilities
 */

import dotenv from "dotenv";
dotenv.config();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";

import {
  getSwapQuote,
  executeSwap,
  getAllBalances,
  getAgentInfo,
  listTokens,
} from "./onchain";
import { agentAccount } from "./chain";
import {
  getMarketPrice,
  getMarketPrices,
  getSwapQuoteFromDEX,
  searchToken,
  getPortfolioBalances,
  onchainOS,
  getUniswapPools,
  getTokenLiquidity,
  getDefiDetail,
} from "./onchainos-mcp";
import {
  getMarketOverview,
  getPoolStats,
  getTradeHistory,
  getEconomyLoop,
  generateAISignal,
  getFeeTreasuryStatus,
} from "./analytics";
import { processPayment, getPricingInfo } from "./x402";

// ---------------------------------------------------------------------------
// DCA Store (shared in-process)
// ---------------------------------------------------------------------------

interface DCASchedule {
  id: string;
  fromToken: string;
  toToken: string;
  amount: number;
  intervalMs: number;
  total: number;
  remaining: number;
  status: "active" | "paused" | "completed" | "cancelled";
  executions: Array<{ txHash: string; amountOut: string; timestamp: number }>;
  timer?: ReturnType<typeof setInterval>;
}

const dcaSchedules = new Map<string, DCASchedule>();
let dcaCounter = 0;

// ---------------------------------------------------------------------------
// Create MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer(
  {
    name: "pulsetrader-plus",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    instructions:
      "PulseTrader+ is an AI trading agent on X Layer. " +
      "Use these tools to execute swaps, check prices, manage DCA strategies, " +
      "and query portfolio balances — all on X Layer Testnet with 200ms Flashblock confirmations. " +
      "Resources provide read-only access to agent state. Prompts provide guided workflows.",
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_swap
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_swap",
  "Execute a token swap on X Layer Testnet. Swaps between OKB, PUSDC, and PWETH with 0.1% fee. Transactions are confirmed via Flashblocks in ~200ms.",
  {
    fromToken: z.string().describe("Source token symbol: OKB, PUSDC, or PWETH"),
    toToken: z
      .string()
      .describe("Destination token symbol: OKB, PUSDC, or PWETH"),
    amount: z
      .number()
      .positive()
      .describe("Amount of source token to swap (e.g. 100)"),
  },
  async ({ fromToken, toToken, amount }) => {
    try {
      const result = await executeSwap(fromToken, toToken, amount);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                txHash: result.txHash,
                fromToken: result.fromToken,
                toToken: result.toToken,
                amountIn: result.amountIn,
                amountOut: result.amountOut,
                feeAmount: result.feeAmount,
                explorerUrl: result.explorerUrl,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_quote
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_quote",
  "Get a price quote for a token swap without executing it. Shows expected output amount, fee, and exchange rate.",
  {
    fromToken: z.string().describe("Source token symbol: OKB, PUSDC, or PWETH"),
    toToken: z
      .string()
      .describe("Destination token symbol: OKB, PUSDC, or PWETH"),
    amount: z.number().positive().describe("Amount of source token"),
  },
  async ({ fromToken, toToken, amount }) => {
    try {
      const quote = getSwapQuote(fromToken, toToken, amount);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(quote, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_balance
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_balance",
  "Check the agent wallet's token balances on X Layer Testnet. Returns OKB, PUSDC, and PWETH balances.",
  {},
  async () => {
    try {
      if (!agentAccount) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Agent wallet not configured",
            },
          ],
          isError: true,
        };
      }
      const balances = await getAllBalances(agentAccount.address);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { address: agentAccount.address, balances },
              (_k, v) => (typeof v === "bigint" ? v.toString() : v),
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_dca_create
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_dca_create",
  "Set up a Dollar-Cost Averaging (DCA) schedule that automatically executes recurring swaps at a fixed interval.",
  {
    fromToken: z.string().describe("Source token symbol"),
    toToken: z.string().describe("Destination token symbol"),
    amount: z.number().positive().describe("Amount per swap"),
    intervalSeconds: z
      .number()
      .min(30)
      .describe("Interval between swaps in seconds (minimum 30)"),
    totalSwaps: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("Total number of swaps to execute (1-100)"),
  },
  async ({ fromToken, toToken, amount, intervalSeconds, totalSwaps }) => {
    try {
      const id = `dca-${++dcaCounter}`;
      const schedule: DCASchedule = {
        id,
        fromToken,
        toToken,
        amount,
        intervalMs: intervalSeconds * 1000,
        total: totalSwaps,
        remaining: totalSwaps,
        status: "active",
        executions: [],
      };

      // Start the interval
      schedule.timer = setInterval(async () => {
        if (schedule.status !== "active" || schedule.remaining <= 0) {
          if (schedule.timer) clearInterval(schedule.timer);
          if (schedule.remaining <= 0) schedule.status = "completed";
          return;
        }

        try {
          const result = await executeSwap(
            schedule.fromToken,
            schedule.toToken,
            schedule.amount
          );
          schedule.executions.push({
            txHash: result.txHash,
            amountOut: result.amountOut,
            timestamp: Date.now(),
          });
          schedule.remaining--;
          console.error(
            `[MCP] DCA ${id} #${schedule.total - schedule.remaining}/${schedule.total}: ${result.amountIn} ${fromToken} → ${result.amountOut} ${toToken}`
          );

          if (schedule.remaining <= 0) {
            schedule.status = "completed";
            if (schedule.timer) clearInterval(schedule.timer);
          }
        } catch (err: any) {
          console.error(`[MCP] DCA ${id} error:`, err.message);
        }
      }, schedule.intervalMs);

      dcaSchedules.set(id, schedule);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                dcaId: id,
                fromToken,
                toToken,
                amountPerSwap: amount,
                intervalSeconds,
                totalSwaps,
                status: "active",
                message: `DCA schedule created. Will swap ${amount} ${fromToken} → ${toToken} every ${intervalSeconds}s, ${totalSwaps} times.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_dca_status
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_dca_status",
  "Check or manage an existing DCA schedule. Actions: status, pause, resume, cancel. Use 'list' as dcaId to see all schedules.",
  {
    dcaId: z
      .string()
      .describe(
        "DCA schedule ID (e.g. 'dca-1') or 'list' to see all schedules"
      ),
    action: z
      .enum(["status", "pause", "resume", "cancel"])
      .default("status")
      .describe("Action to perform"),
  },
  async ({ dcaId, action }) => {
    // List all
    if (dcaId === "list") {
      const all = Array.from(dcaSchedules.values()).map((s) => ({
        id: s.id,
        status: s.status,
        pair: `${s.fromToken}→${s.toToken}`,
        amount: s.amount,
        progress: `${s.total - s.remaining}/${s.total}`,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text:
              all.length > 0
                ? JSON.stringify(all, null, 2)
                : "No DCA schedules found.",
          },
        ],
      };
    }

    const schedule = dcaSchedules.get(dcaId);
    if (!schedule) {
      return {
        content: [
          {
            type: "text" as const,
            text: `DCA schedule '${dcaId}' not found. Use 'list' to see all schedules.`,
          },
        ],
        isError: true,
      };
    }

    switch (action) {
      case "pause":
        schedule.status = "paused";
        break;
      case "resume":
        schedule.status = "active";
        break;
      case "cancel":
        schedule.status = "cancelled";
        if (schedule.timer) clearInterval(schedule.timer);
        break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: schedule.id,
              status: schedule.status,
              pair: `${schedule.fromToken}→${schedule.toToken}`,
              amount: schedule.amount,
              progress: `${schedule.total - schedule.remaining}/${schedule.total}`,
              executionCount: schedule.executions.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_market_price
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_market_price",
  "Get real-time market price of any token using OnchainOS DEX Market data. Supports 20+ chains. Use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native tokens.",
  {
    address: z
      .string()
      .describe(
        "Token contract address. Use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native tokens."
      ),
    chain: z
      .string()
      .default("xlayer")
      .describe("Chain: xlayer, ethereum, base, bsc, solana, etc."),
  },
  async ({ address, chain }) => {
    try {
      const price = await getMarketPrice(address, chain);
      if (!price) {
        // Fallback to batch prices
        const batchResult = await getMarketPrices(`${chain}:${address}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(batchResult, null, 2),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(price, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_search_token
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_search_token",
  "Search for tokens by name, symbol, or address across 20+ chains using OnchainOS DEX Token data.",
  {
    query: z
      .string()
      .describe(
        "Token name, symbol, or contract address (e.g. 'ETH', 'USDC', '0x...')"
      ),
    chains: z
      .string()
      .optional()
      .describe("Comma-separated chain filter (e.g. 'xlayer,ethereum')"),
  },
  async ({ query, chains }) => {
    try {
      const results = await searchToken(query, chains);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_agent_info
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_agent_info",
  "Get PulseTrader+ agent info: wallet address, supported tokens, network, builder code, and capabilities.",
  {},
  async () => {
    try {
      const info = await getAgentInfo();
      const tokens = listTokens();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...info,
                supportedTokens: tokens,
                network: "X Layer Testnet",
                chainId: 1952,
                features: [
                  "Token swaps (OKB, PUSDC, PWETH)",
                  "Dollar-Cost Averaging (DCA)",
                  "Real-time market prices via OnchainOS",
                  "Token search across 20+ chains",
                  "200ms Flashblock confirmations",
                  "ERC-8021 Builder Code attribution",
                  "0.1% micro-fee economy loop",
                  "x402 premium analytics paywall",
                ],
              },
              (_k, v) => (typeof v === "bigint" ? v.toString() : v),
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_uniswap_pools
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_uniswap_pools",
  "Search for Uniswap V3 liquidity pools using OnchainOS DeFi skill. Returns pool info including APY, TVL, fee tier, and trading volume.",
  {
    query: z
      .string()
      .describe(
        "Search query: token name, pair, or keyword (e.g. 'ETH-USDC', 'WETH', 'stablecoin')"
      ),
    chain: z
      .string()
      .default("xlayer")
      .describe("Chain: xlayer, ethereum, base, arbitrum, polygon, bsc, etc."),
  },
  async ({ query, chain }) => {
    try {
      const pools = await getUniswapPools(query, chain);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(pools, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_token_liquidity
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_token_liquidity",
  "Get top liquidity pools for a specific token address using OnchainOS. Returns up to 5 pools with DEX, TVL, and volume data.",
  {
    address: z
      .string()
      .describe(
        "Token contract address. Use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native tokens."
      ),
    chain: z
      .string()
      .default("xlayer")
      .describe("Chain: xlayer, ethereum, base, bsc, etc."),
  },
  async ({ address, chain }) => {
    try {
      const liquidity = await getTokenLiquidity(address, chain);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(liquidity, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_x402_analytics
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_x402_analytics",
  "Access premium analytics gated by x402 micropayment. Pays the fee automatically and returns analytics data. Resources: market-overview, pool-stats, trade-history, economy-loop.",
  {
    resource: z
      .enum(["market-overview", "pool-stats", "trade-history", "economy-loop"])
      .describe(
        "Analytics resource to access: market-overview (prices+gas), pool-stats (TVL/APY), trade-history (recent trades), economy-loop (revenue dashboard)"
      ),
  },
  async ({ resource }) => {
    try {
      // Auto-pay via x402
      const payment = await processPayment(resource, "demo");

      let data: unknown;
      switch (resource) {
        case "market-overview":
          data = await getMarketOverview();
          break;
        case "pool-stats":
          data = await getPoolStats();
          break;
        case "trade-history":
          data = await getTradeHistory(15);
          break;
        case "economy-loop":
          data = await getEconomyLoop();
          break;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                premium: true,
                x402: {
                  resource,
                  paid: payment.paymentInfo.amount,
                  sessionId: payment.session.id,
                },
                data,
              },
              (_k, v) => (typeof v === "bigint" ? v.toString() : v),
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text" as const, text: `Error: ${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_x402_pricing
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_x402_pricing",
  "Get x402 premium analytics pricing info — shows all available endpoints and their PUSDC costs.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(getPricingInfo(), null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_defi_detail
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_defi_detail",
  "Get detailed information about a specific DeFi product (pool, vault, farm) using OnchainOS. Returns APY breakdown, TVL, fee rate, and supported tokens.",
  {
    productId: z.string().describe("The DeFi product ID from pool search results."),
    chain: z.string().default("xlayer").describe("Chain: xlayer, ethereum, base, bsc, etc."),
  },
  async ({ productId, chain }) => {
    try {
      const detail = await getDefiDetail(productId, chain);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(detail, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: pulsetrader_ai_signal
// ---------------------------------------------------------------------------

server.tool(
  "pulsetrader_ai_signal",
  "Generate an AI trading signal with confidence score, portfolio analysis, and trade recommendation. Costs 2.00 PUSDC via x402 micropayment.",
  {},
  async () => {
    try {
      const payment = await processPayment("ai-signal", "demo");
      const signal = await generateAISignal();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            premium: true,
            x402: { paid: payment.paymentInfo.amount, sessionId: payment.session.id },
            ...signal,
          }, null, 2),
        }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// MCP Resources — Read-only access to agent state (full MCP spec compliance)
// ---------------------------------------------------------------------------

server.resource(
  "portfolio",
  "pulsetrader://portfolio",
  async (uri) => {
    const balances = agentAccount
      ? await getAllBalances(agentAccount.address).catch(() => [])
      : [];
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          agent: agentAccount?.address,
          balances: balances.map(b => ({ token: b.token, balance: b.balance })),
          chain: "X Layer Testnet (1952)",
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }
);

server.resource(
  "economy-loop",
  "pulsetrader://economy-loop",
  async (uri) => {
    const economy = await getEconomyLoop();
    const treasury = getFeeTreasuryStatus();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({ ...economy, treasury }, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v, 2),
      }],
    };
  }
);

server.resource(
  "config",
  "pulsetrader://config",
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          agent: agentAccount?.address,
          chain: { name: "X Layer Testnet", chainId: 1952, rpc: "https://testrpc.xlayer.tech" },
          builderCode: "PULSETRDRV1XLYR0",
          tokens: {
            PUSDC: process.env.PUSDC_ADDRESS,
            PWETH: process.env.PWETH_ADDRESS,
          },
          capabilities: [
            "swap", "quote", "balance", "dca", "market_price", "dex_quote",
            "token_search", "portfolio", "gas_price", "uniswap_pools",
            "token_liquidity", "defi_detail", "x402_analytics", "ai_signal",
          ],
          economyLoop: {
            swapFee: "0.1% (10 bps)",
            x402Endpoints: 6,
            rebalancer: "Autonomous (60s interval)",
            feeTreasury: "Auto-sweep + reinvest",
          },
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// MCP Prompts — Guided workflows (full MCP spec compliance)
// ---------------------------------------------------------------------------

server.prompt(
  "trade_strategy",
  "Help build a trading strategy for a specific token pair. Analyzes portfolio, market data, and suggests entry/exit points.",
  { token: z.string().optional().describe("Token symbol to analyze (e.g. ETH, OKB). Defaults to PWETH.") },
  ({ token }) => {
    const t = token || "PWETH";
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Analyze my current portfolio allocation, then research ${t} using market price data and Uniswap liquidity pools. Based on the data, suggest a specific trading strategy including: (1) whether to buy, sell, or hold, (2) how much to allocate, (3) whether to use DCA or a single swap, and (4) risk considerations. Use the AI signal tool for a comprehensive recommendation.`,
        },
      }],
    };
  }
);

server.prompt(
  "portfolio_review",
  "Comprehensive portfolio review with rebalancing suggestions. Checks balances, prices, and allocation percentages.",
  {},
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: "Give me a complete portfolio review. Check my current balances, get live prices for all tokens, calculate my allocation percentages, and compare against optimal targets (50% stablecoins, 40% ETH, 10% OKB). If any position is out of balance, suggest specific rebalancing trades. Also check the rebalancer status and recent economy loop activity.",
      },
    }],
  })
);

server.prompt(
  "economy_deep_dive",
  "Deep dive into the PulseTrader+ economy loop. Shows revenue streams, fee treasury, x402 payments, and the complete earn-pay-earn cycle.",
  {},
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: "Show me the complete economy loop dashboard. I want to see: (1) total trading fee revenue, (2) x402 premium analytics revenue, (3) fee treasury sweep history, (4) auto-reinvestment trades, and (5) the rebalancer's autonomous activity. Use the premium analytics tools to get the full picture — this demonstrates the earn-pay-earn cycle.",
      },
    }],
  })
);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

async function main() {
  // Initialize OnchainOS MCP bridge
  try {
    await onchainOS.connect();
    console.error("✅ [MCP] OnchainOS bridge connected");
  } catch (err) {
    console.error(
      "⚠️  [MCP] OnchainOS bridge failed (market data unavailable):",
      err
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ [MCP] PulseTrader+ MCP Server running on stdio");
  console.error(
    `   Agent wallet: ${agentAccount?.address || "NOT SET"}`
  );
  console.error("   Tools: 14 registered | Resources: 3 | Prompts: 3");
}

main().catch((err) => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
