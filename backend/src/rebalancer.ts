/**
 * Autonomous Portfolio Rebalancer — PulseTrader+
 *
 * Background loop that monitors the agent's portfolio and automatically
 * rebalances when token allocations drift beyond configurable thresholds.
 *
 * This makes PulseTrader+ truly "agentic" — it acts WITHOUT human prompting.
 *
 * Rules:
 *   - If PWETH exceeds 60% of portfolio value → sell excess PWETH for PUSDC
 *   - If PUSDC exceeds 70% of portfolio value → buy PWETH with excess PUSDC
 *   - Minimum trade size: 5 PUSDC equivalent
 *   - Cooldown: 120 seconds between rebalances
 *   - All trades go through the normal swap engine (fees, builder code, etc.)
 */

import { getAllBalances, executeSwap, getCurrentPrices, type SwapResult } from "./onchain";
import { agentAccount } from "./chain";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REBALANCE_INTERVAL_MS = 60_000; // Check every 60 seconds
const COOLDOWN_MS = 120_000; // Min 2 minutes between actual trades
const PWETH_MAX_PCT = 0.55; // Sell if PWETH > 55%
const PUSDC_MAX_PCT = 0.60; // Buy PWETH if PUSDC > 60%
const MIN_TRADE_USD = 5; // Minimum trade size in USD equivalent

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RebalanceEvent {
  timestamp: number;
  action: "sell_pweth" | "buy_pweth" | "check_only";
  reason: string;
  allocation: { okb: number; pusdc: number; pweth: number };
  trade?: SwapResult;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastRebalanceAt = 0;
const rebalanceHistory: RebalanceEvent[] = [];
let rebalanceCallback: ((event: RebalanceEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Core Logic
// ---------------------------------------------------------------------------

export function setRebalanceCallback(cb: (event: RebalanceEvent) => void) {
  rebalanceCallback = cb;
}

async function checkAndRebalance(): Promise<void> {
  if (!agentAccount) return;

  try {
    const balances = await getAllBalances(agentAccount.address);
    const prices = getCurrentPrices();

    // Calculate USD values
    const values: Record<string, number> = {};
    let totalValue = 0;

    for (const b of balances) {
      const price = prices[b.token] ?? 0;
      const usd = parseFloat(b.balance) * price;
      values[b.token] = usd;
      totalValue += usd;
    }

    if (totalValue < 1) return; // Portfolio too small

    // Calculate allocations
    const allocation = {
      okb: (values.OKB || 0) / totalValue,
      pusdc: (values.PUSDC || 0) / totalValue,
      pweth: (values.PWETH || 0) / totalValue,
    };

    const now = Date.now();
    const cooledDown = now - lastRebalanceAt > COOLDOWN_MS;

    // Rule 1: PWETH too high → sell PWETH for PUSDC
    if (allocation.pweth > PWETH_MAX_PCT && cooledDown) {
      const excessPct = allocation.pweth - 0.50; // Rebalance to 50%
      const excessUSD = excessPct * totalValue;

      if (excessUSD >= MIN_TRADE_USD) {
        const pwethPrice = prices.PWETH || 2500;
        const sellAmount = Math.min(excessUSD / pwethPrice, parseFloat(
          balances.find(b => b.token === "PWETH")?.balance || "0"
        ) * 0.3); // Never sell more than 30% in one go

        if (sellAmount > 0.001) {
          const reason = `PWETH at ${(allocation.pweth * 100).toFixed(1)}% (>${(PWETH_MAX_PCT * 100)}%), selling ${sellAmount.toFixed(6)} PWETH → PUSDC`;
          console.log(`⚖️  Rebalancer: ${reason}`);

          try {
            const trade = await executeSwap("PWETH", "PUSDC", parseFloat(sellAmount.toFixed(6)));
            lastRebalanceAt = now;

            const event: RebalanceEvent = {
              timestamp: now,
              action: "sell_pweth",
              reason,
              allocation,
              trade,
            };
            rebalanceHistory.push(event);
            rebalanceCallback?.(event);
            return;
          } catch (err: any) {
            console.warn(`⚖️  Rebalancer trade failed: ${err.message}`);
          }
        }
      }
    }

    // Rule 2: PUSDC too high → buy PWETH
    if (allocation.pusdc > PUSDC_MAX_PCT && cooledDown) {
      const excessPct = allocation.pusdc - 0.50; // Rebalance to 50%
      const excessUSD = excessPct * totalValue;

      if (excessUSD >= MIN_TRADE_USD) {
        const pusdcBalance = parseFloat(
          balances.find(b => b.token === "PUSDC")?.balance || "0"
        );
        const buyAmount = Math.min(excessUSD, pusdcBalance * 0.3); // Max 30% at once

        if (buyAmount >= 5) {
          const reason = `PUSDC at ${(allocation.pusdc * 100).toFixed(1)}% (>${(PUSDC_MAX_PCT * 100)}%), buying PWETH with ${buyAmount.toFixed(2)} PUSDC`;
          console.log(`⚖️  Rebalancer: ${reason}`);

          try {
            const trade = await executeSwap("PUSDC", "PWETH", parseFloat(buyAmount.toFixed(2)));
            lastRebalanceAt = now;

            const event: RebalanceEvent = {
              timestamp: now,
              action: "buy_pweth",
              reason,
              allocation,
              trade,
            };
            rebalanceHistory.push(event);
            rebalanceCallback?.(event);
            return;
          } catch (err: any) {
            console.warn(`⚖️  Rebalancer trade failed: ${err.message}`);
          }
        }
      }
    }

    // No action needed — log check
    const event: RebalanceEvent = {
      timestamp: now,
      action: "check_only",
      reason: `Portfolio balanced — OKB:${(allocation.okb * 100).toFixed(1)}% PUSDC:${(allocation.pusdc * 100).toFixed(1)}% PWETH:${(allocation.pweth * 100).toFixed(1)}%`,
      allocation,
    };
    // Only keep last check in history (don't spam)
    if (rebalanceHistory.length === 0 || rebalanceHistory[rebalanceHistory.length - 1].action !== "check_only") {
      rebalanceHistory.push(event);
    } else {
      rebalanceHistory[rebalanceHistory.length - 1] = event;
    }

  } catch (err: any) {
    console.warn(`⚖️  Rebalancer check failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startRebalancer(): void {
  if (isRunning) return;
  isRunning = true;
  console.log("⚖️  Autonomous Rebalancer started (60s interval, thresholds: PWETH>55%, PUSDC>60%)");

  // Initial check after 10 seconds
  setTimeout(checkAndRebalance, 10_000);

  intervalId = setInterval(checkAndRebalance, REBALANCE_INTERVAL_MS);
}

export function stopRebalancer(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log("⚖️  Autonomous Rebalancer stopped");
}

export function getRebalancerStatus(): {
  running: boolean;
  lastCheck: number | null;
  rebalanceCount: number;
  history: RebalanceEvent[];
  config: {
    intervalMs: number;
    cooldownMs: number;
    pwethMaxPct: number;
    pusdcMaxPct: number;
    minTradeUsd: number;
  };
} {
  return {
    running: isRunning,
    lastCheck: rebalanceHistory.length > 0 ? rebalanceHistory[rebalanceHistory.length - 1].timestamp : null,
    rebalanceCount: rebalanceHistory.filter(e => e.action !== "check_only").length,
    history: rebalanceHistory.slice(-20),
    config: {
      intervalMs: REBALANCE_INTERVAL_MS,
      cooldownMs: COOLDOWN_MS,
      pwethMaxPct: PWETH_MAX_PCT,
      pusdcMaxPct: PUSDC_MAX_PCT,
      minTradeUsd: MIN_TRADE_USD,
    },
  };
}
