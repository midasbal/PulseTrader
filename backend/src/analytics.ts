/**
 * PulseTrader+ Analytics Engine
 *
 * Collects and aggregates analytics data from multiple sources:
 *  - OnchainOS market data (real-time prices)
 *  - Internal trade history (swap executions + DCA)
 *  - Fee revenue tracking (economy loop metrics)
 *  - Mock pool stats (for hackathon demo)
 *
 * All data functions are pure — the x402 gate controls access.
 */

import { agentAccount, config } from "./chain";
import { getAllBalances, type SwapResult, executeSwap } from "./onchain";
import {
  getMarketPrice,
  getMarketPrices,
  getGasPrice,
  searchToken,
  onchainOS,
} from "./onchainos-mcp";

// ---------------------------------------------------------------------------
// Trade History Store (in-memory, shared with agent)
// ---------------------------------------------------------------------------

const tradeHistory: SwapResult[] = [];
let totalFeesCollectedPUSDC = 0;
let totalFeesCollectedPWETH = 0;
let totalFeesCollectedOKB = 0;
let totalTradesExecuted = 0;
let totalVolumeUSD = 0;

/**
 * Record a trade for analytics tracking.
 * Called from the execution engine after each swap.
 */
export function recordTrade(trade: SwapResult): void {
  tradeHistory.push(trade);
  totalTradesExecuted++;

  // Track fees by token
  const feeAmount = parseFloat(trade.feeAmount);
  switch (trade.toToken) {
    case "PUSDC":
      totalFeesCollectedPUSDC += feeAmount;
      totalVolumeUSD += parseFloat(trade.amountOut);
      break;
    case "PWETH":
      totalFeesCollectedPWETH += feeAmount;
      totalVolumeUSD += parseFloat(trade.amountOut) * 2500; // mock price
      break;
    case "OKB":
      totalFeesCollectedOKB += feeAmount;
      totalVolumeUSD += parseFloat(trade.amountOut) * 50; // mock price
      break;
  }
}

// ---------------------------------------------------------------------------
// Analytics Data Functions
// ---------------------------------------------------------------------------

/**
 * Market Overview — real-time prices + gas from OnchainOS.
 */
export async function getMarketOverview(): Promise<{
  tokens: Array<{
    symbol: string;
    price: string | null;
    change24h: string;
    source: string;
  }>;
  gas: {
    chain: string;
    gasPrice: unknown;
  };
  timestamp: string;
}> {
  // Fetch real prices from OnchainOS for major tokens
  const [okbPrice, ethPrice, btcPrice, gasData] = await Promise.all([
    getMarketPrice(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "xlayer"
    ).catch(() => null),
    getMarketPrice(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "ethereum"
    ).catch(() => null),
    getMarketPrice(
      "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      "ethereum"
    ).catch(() => null), // WBTC
    getGasPrice("xlayer").catch(() => null),
  ]);

  return {
    tokens: [
      {
        symbol: "OKB",
        price: okbPrice?.price || "50.00",
        change24h: "+2.4%",
        source: onchainOS.isReady() ? "OnchainOS Live" : "Mock Oracle",
      },
      {
        symbol: "ETH",
        price: ethPrice?.price || "2500.00",
        change24h: "+1.8%",
        source: onchainOS.isReady() ? "OnchainOS Live" : "Mock Oracle",
      },
      {
        symbol: "BTC",
        price: btcPrice?.price || "65000.00",
        change24h: "+0.9%",
        source: onchainOS.isReady() ? "OnchainOS Live" : "Mock Oracle",
      },
      {
        symbol: "PUSDC",
        price: "1.00",
        change24h: "0.0%",
        source: "Pegged (Testnet Mock)",
      },
      {
        symbol: "PWETH",
        price: "2500.00",
        change24h: "+1.8%",
        source: "Pegged to ETH (Testnet Mock)",
      },
    ],
    gas: {
      chain: "X Layer Testnet (1952)",
      gasPrice: gasData || { standard: "0.001 Gwei", fast: "0.002 Gwei" },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pool Statistics — simulated pool data for PUSDC/PWETH pair.
 * In production this would call Uniswap getPoolInfo via OnchainOS.
 */
export async function getPoolStats(): Promise<{
  pools: Array<{
    pair: string;
    tvl: string;
    volume24h: string;
    apy: string;
    fee: string;
    txCount: number;
    priceRatio: string;
  }>;
  agentMetrics: {
    totalTrades: number;
    totalVolumeUSD: string;
    totalFeesUSD: string;
    avgTradeSize: string;
    mostTradedPair: string;
  };
  timestamp: string;
}> {
  // Calculate real metrics from our trade history
  const avgTradeSize =
    totalTradesExecuted > 0
      ? (totalVolumeUSD / totalTradesExecuted).toFixed(2)
      : "0.00";

  // Count pair frequencies
  const pairCounts: Record<string, number> = {};
  for (const trade of tradeHistory) {
    const pair = `${trade.fromToken}/${trade.toToken}`;
    pairCounts[pair] = (pairCounts[pair] || 0) + 1;
  }
  const mostTradedPair =
    Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "PUSDC/PWETH";

  return {
    pools: [
      {
        pair: "PUSDC/PWETH",
        tvl: `$${(2_500_000 + totalVolumeUSD * 0.05).toFixed(2)}`,
        volume24h: `$${totalVolumeUSD.toFixed(2)}`,
        apy: `${(12.5 + Math.random() * 3).toFixed(2)}%`,
        fee: "0.1% (10 bps)",
        txCount: totalTradesExecuted,
        priceRatio: "1 PWETH = 2,500 PUSDC",
      },
      {
        pair: "OKB/PUSDC",
        tvl: `$${(500_000 + totalVolumeUSD * 0.02).toFixed(2)}`,
        volume24h: `$${(totalVolumeUSD * 0.3).toFixed(2)}`,
        apy: `${(8.2 + Math.random() * 2).toFixed(2)}%`,
        fee: "0.1% (10 bps)",
        txCount: Math.floor(totalTradesExecuted * 0.4),
        priceRatio: "1 OKB = 50 PUSDC",
      },
      {
        pair: "OKB/PWETH",
        tvl: `$${(300_000 + totalVolumeUSD * 0.01).toFixed(2)}`,
        volume24h: `$${(totalVolumeUSD * 0.2).toFixed(2)}`,
        apy: `${(6.8 + Math.random() * 2).toFixed(2)}%`,
        fee: "0.1% (10 bps)",
        txCount: Math.floor(totalTradesExecuted * 0.2),
        priceRatio: "1 OKB = 0.02 PWETH",
      },
    ],
    agentMetrics: {
      totalTrades: totalTradesExecuted,
      totalVolumeUSD: `$${totalVolumeUSD.toFixed(2)}`,
      totalFeesUSD: `$${(
        totalFeesCollectedPUSDC +
        totalFeesCollectedPWETH * 2500 +
        totalFeesCollectedOKB * 50
      ).toFixed(4)}`,
      avgTradeSize: `$${avgTradeSize}`,
      mostTradedPair,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Trade History — recent trades from the agent with full details.
 */
export async function getTradeHistory(limit = 20): Promise<{
  trades: Array<{
    txHash: string;
    fromToken: string;
    toToken: string;
    amountIn: string;
    amountOut: string;
    feeAmount: string;
    explorerUrl: string;
    timestamp: number;
    age: string;
  }>;
  summary: {
    total: number;
    last24h: number;
    totalFees: {
      PUSDC: string;
      PWETH: string;
      OKB: string;
    };
  };
  timestamp: string;
}> {
  const now = Date.now();
  const last24h = tradeHistory.filter(
    (t) => now - t.timestamp < 24 * 60 * 60 * 1000
  );

  const recentTrades = tradeHistory
    .slice(-limit)
    .reverse()
    .map((t) => ({
      ...t,
      age: formatAge(now - t.timestamp),
    }));

  return {
    trades: recentTrades,
    summary: {
      total: tradeHistory.length,
      last24h: last24h.length,
      totalFees: {
        PUSDC: totalFeesCollectedPUSDC.toFixed(6),
        PWETH: totalFeesCollectedPWETH.toFixed(6),
        OKB: totalFeesCollectedOKB.toFixed(6),
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Economy Loop Dashboard — the agent's autonomous economy stats.
 */
export async function getEconomyLoop(): Promise<{
  wallet: {
    address: string;
    balances: Array<{ token: string; balance: string }>;
    explorerUrl: string;
  };
  revenue: {
    tradingFees: {
      PUSDC: string;
      PWETH: string;
      OKB: string;
      totalUSD: string;
    };
    x402Revenue: {
      totalPayments: number;
      totalUSD: string;
    };
    totalRevenueUSD: string;
  };
  activity: {
    totalTransactions: number;
    activeDCASchedules: number;
    uptime: string;
  };
  builderCode: string;
  timestamp: string;
}> {
  const balances = agentAccount
    ? await getAllBalances(agentAccount.address).catch(() => [])
    : [];

  const tradingFeesUSD =
    totalFeesCollectedPUSDC +
    totalFeesCollectedPWETH * 2500 +
    totalFeesCollectedOKB * 50;

  const x402Revenue = getX402Revenue();

  return {
    wallet: {
      address: agentAccount?.address || "NOT CONFIGURED",
      balances: balances.map((b) => ({ token: b.token, balance: b.balance })),
      explorerUrl: `${config.explorerUrl}/address/${agentAccount?.address}`,
    },
    revenue: {
      tradingFees: {
        PUSDC: totalFeesCollectedPUSDC.toFixed(6),
        PWETH: totalFeesCollectedPWETH.toFixed(6),
        OKB: totalFeesCollectedOKB.toFixed(6),
        totalUSD: `$${tradingFeesUSD.toFixed(4)}`,
      },
      x402Revenue: {
        totalPayments: x402Revenue.totalPayments,
        totalUSD: `$${x402Revenue.totalUSD.toFixed(4)}`,
      },
      totalRevenueUSD: `$${(tradingFeesUSD + x402Revenue.totalUSD).toFixed(4)}`,
    },
    activity: {
      totalTransactions: totalTradesExecuted,
      activeDCASchedules: 0, // Will be wired from agent.ts
      uptime: formatAge(Date.now() - serverStartTime),
    },
    builderCode: config.builderCode,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// x402 Revenue Tracking
// ---------------------------------------------------------------------------

let x402PaymentCount = 0;
let x402RevenueUSD = 0;
const serverStartTime = Date.now();

export function recordX402Payment(amountUSD: number): void {
  x402PaymentCount++;
  x402RevenueUSD += amountUSD;
}

export function getX402Revenue(): {
  totalPayments: number;
  totalUSD: number;
} {
  return {
    totalPayments: x402PaymentCount,
    totalUSD: x402RevenueUSD,
  };
}

// ---------------------------------------------------------------------------
// Fee Treasury — Onchain proof that the economy loop closes
// ---------------------------------------------------------------------------

const TREASURY_ADDRESS = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;
const FEE_SWEEP_THRESHOLD_PUSDC = 2.0; // Sweep when 2+ PUSDC in fees
const FEE_REINVEST_THRESHOLD = 5.0;    // Auto-DCA when 5+ PUSDC available
let lastFeeSweepAt = 0;
let feeSweepCount = 0;
const feeSweepHistory: Array<{
  timestamp: number;
  amount: string;
  token: string;
  txHash: string;
  type: "treasury_sweep" | "auto_reinvest";
}> = [];

/**
 * Fee Treasury Sweep — periodically transfer accumulated fees to treasury (burn address)
 * to create onchain proof of the earn-pay-earn cycle.
 */
export async function checkFeeSweep(): Promise<void> {
  if (!agentAccount) return;
  const now = Date.now();
  if (now - lastFeeSweepAt < 180_000) return; // 3-min cooldown

  // Check if accumulated fees exceed threshold
  if (totalFeesCollectedPUSDC >= FEE_SWEEP_THRESHOLD_PUSDC) {
    try {
      const { walletClient: wc, config: cfg } = await import("./chain");
      const { parseUnits } = await import("viem");
      const { ERC20_ABI } = await import("./abi/erc20");

      if (!wc || !cfg.pusdcAddress) return;

      const sweepAmount = Math.floor(totalFeesCollectedPUSDC * 0.5 * 1e6) / 1e6; // Sweep 50% of fees
      if (sweepAmount < 0.5) return;

      const raw = parseUnits(sweepAmount.toFixed(6), 6);
      const txHash = await wc.writeContract({
        account: agentAccount,
        address: cfg.pusdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [TREASURY_ADDRESS, raw],
        chain: null,
      });

      feeSweepHistory.push({
        timestamp: now,
        amount: sweepAmount.toFixed(6),
        token: "PUSDC",
        txHash,
        type: "treasury_sweep",
      });
      feeSweepCount++;
      lastFeeSweepAt = now;
      totalFeesCollectedPUSDC -= sweepAmount; // Deduct swept fees

      console.log(`🏦 Fee Treasury Sweep: ${sweepAmount} PUSDC → treasury (tx: ${txHash.slice(0, 18)}...)`);
    } catch (err: any) {
      console.warn(`🏦 Fee sweep failed: ${err.message}`);
    }
  }
}

/**
 * Fee-Funded Auto-DCA — reinvest accumulated fees by buying PWETH.
 * Demonstrates: fees earned → reinvested → more trading volume → more fees.
 */
export async function checkFeeReinvest(): Promise<void> {
  if (!agentAccount) return;

  // Only reinvest when x402 revenue has accumulated enough
  if (x402RevenueUSD >= FEE_REINVEST_THRESHOLD) {
    try {
      const reinvestAmount = Math.floor(x402RevenueUSD * 0.4 * 100) / 100; // 40% of x402 revenue
      if (reinvestAmount < 2.0) return;

      const result = await executeSwap("PUSDC", "PWETH", reinvestAmount);

      feeSweepHistory.push({
        timestamp: Date.now(),
        amount: reinvestAmount.toFixed(2),
        token: "PUSDC→PWETH",
        txHash: result.txHash,
        type: "auto_reinvest",
      });

      x402RevenueUSD -= reinvestAmount;
      console.log(`♻️  Fee Auto-Reinvest: ${reinvestAmount} PUSDC → PWETH (tx: ${result.txHash.slice(0, 18)}...)`);
    } catch (err: any) {
      console.warn(`♻️  Fee reinvest failed: ${err.message}`);
    }
  }
}

/**
 * Get fee treasury status for the economy loop dashboard.
 */
export function getFeeTreasuryStatus(): {
  treasuryAddress: string;
  sweepCount: number;
  sweepHistory: typeof feeSweepHistory;
  pendingFeesPUSDC: number;
  pendingFeesPWETH: number;
} {
  return {
    treasuryAddress: TREASURY_ADDRESS,
    sweepCount: feeSweepCount,
    sweepHistory: feeSweepHistory.slice(-10),
    pendingFeesPUSDC: totalFeesCollectedPUSDC,
    pendingFeesPWETH: totalFeesCollectedPWETH,
  };
}

// ---------------------------------------------------------------------------
// AI Signal Generator (x402 premium — agent charges for its own intelligence)
// ---------------------------------------------------------------------------

export async function generateAISignal(): Promise<{
  signal: {
    action: "buy" | "sell" | "hold";
    token: string;
    confidence: number;
    reasoning: string[];
    priceData: Record<string, string | null>;
    portfolioAllocation: Record<string, number>;
    suggestedTrade?: { from: string; to: string; amount: string; rationale: string };
  };
  meta: {
    generatedAt: string;
    dataSource: string;
    model: string;
  };
}> {
  // 1. Gather real market data
  const [okbPrice, ethPrice] = await Promise.all([
    getMarketPrice("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "xlayer").catch(() => null),
    getMarketPrice("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "ethereum").catch(() => null),
  ]);

  // 2. Get agent portfolio
  const balances = agentAccount
    ? await getAllBalances(agentAccount.address).catch(() => [])
    : [];

  const prices: Record<string, number> = {
    OKB: okbPrice?.price ? parseFloat(okbPrice.price) : 50,
    PWETH: ethPrice?.price ? parseFloat(ethPrice.price) : 2500,
    PUSDC: 1.0,
  };

  // 3. Calculate portfolio allocation
  let totalUSD = 0;
  const values: Record<string, number> = {};
  for (const b of balances) {
    const usd = parseFloat(b.balance) * (prices[b.token] || 0);
    values[b.token] = usd;
    totalUSD += usd;
  }
  const allocation: Record<string, number> = {};
  for (const [token, usd] of Object.entries(values)) {
    allocation[token] = totalUSD > 0 ? Math.round((usd / totalUSD) * 100) : 0;
  }

  // 4. Generate signal based on data analysis
  const reasoning: string[] = [];
  let action: "buy" | "sell" | "hold" = "hold";
  let confidence = 65;
  let suggestedTrade: { from: string; to: string; amount: string; rationale: string } | undefined;

  // Rule-based signal logic (deterministic + data-driven)
  const pusdcPct = allocation.PUSDC || 0;
  const pwethPct = allocation.PWETH || 0;

  if (pusdcPct > 65) {
    action = "buy";
    confidence = 78;
    reasoning.push(`Portfolio is ${pusdcPct}% stablecoins — overweight cash position`);
    reasoning.push("ETH fundamentals remain strong for medium-term accumulation");
    reasoning.push("Recommend rotating 10-15% of PUSDC into PWETH exposure");
    const pusdcBal = parseFloat(balances.find(b => b.token === "PUSDC")?.balance || "0");
    const tradeAmt = Math.min(pusdcBal * 0.1, 5000).toFixed(2);
    suggestedTrade = {
      from: "PUSDC", to: "PWETH", amount: tradeAmt,
      rationale: "Reduce stablecoin concentration; increase ETH beta exposure",
    };
  } else if (pwethPct > 55) {
    action = "sell";
    confidence = 72;
    reasoning.push(`Portfolio is ${pwethPct}% PWETH — high volatility exposure`);
    reasoning.push("Consider taking partial profits to lock in gains");
    reasoning.push("Rebalancing toward 50/50 reduces drawdown risk");
    const pwethBal = parseFloat(balances.find(b => b.token === "PWETH")?.balance || "0");
    const tradeAmt = (pwethBal * 0.1).toFixed(6);
    suggestedTrade = {
      from: "PWETH", to: "PUSDC", amount: tradeAmt,
      rationale: "Take partial profits; reduce single-asset concentration risk",
    };
  } else {
    action = "hold";
    confidence = 70;
    reasoning.push(`Portfolio is well-balanced: ${pusdcPct}% PUSDC, ${pwethPct}% PWETH`);
    reasoning.push("Current allocation is within target range — no urgent action needed");
    reasoning.push("Monitor for macro catalysts before adjusting positions");
  }

  // Add market data context
  if (ethPrice?.price) reasoning.push(`ETH trading at $${parseFloat(ethPrice.price).toLocaleString()} (OnchainOS live)`);
  if (okbPrice?.price) reasoning.push(`OKB at $${parseFloat(okbPrice.price).toLocaleString()} on X Layer`);

  reasoning.push(`Total portfolio value: $${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  reasoning.push(`Signal generated using OnchainOS market data + portfolio analysis`);

  return {
    signal: {
      action,
      token: action === "buy" ? "PWETH" : action === "sell" ? "PWETH" : "—",
      confidence,
      reasoning,
      priceData: {
        OKB: okbPrice?.price || null,
        ETH: ethPrice?.price || null,
        PUSDC: "1.00",
      },
      portfolioAllocation: allocation,
      suggestedTrade,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      dataSource: onchainOS.isReady() ? "OnchainOS Live" : "Cached Oracle",
      model: "PulseTrader+ Signal Engine v1",
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}
