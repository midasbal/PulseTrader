"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ExternalLink,
  RefreshCw,
  Cpu,
  Copy,
  Check,
  Activity,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  DollarSign,
  BarChart3,
  ArrowRightLeft,
} from "lucide-react";
import PulseRingLogo, { Wordmark } from "@/components/PulseRingLogo";
import {
  getBalances,
  getAgentInfo,
  getHealth,
  getPrices,
  getTradeHistory,
  getRebalancerStatus,
  getTreasuryStatus,
  createWebSocket,
  payForAnalytics,
  getAnalytics,
  type AgentInfo,
  type HealthInfo,
  type WSEvent,
  type WSBlockUpdate,
  type WSDCAUpdate,
  type WSRebalanceEvent,
  type TradeRecord,
  type RebalancerStatus,
  type TreasuryStatus,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Safe block number / hash parsers (backend sends blockNumber, not number)
// ---------------------------------------------------------------------------

function parseBlockNum(block: WSBlockUpdate): number {
  const raw = block.number || block.blockNumber || "0x0";
  const n = parseInt(raw, 16);
  return isNaN(n) ? 0 : n;
}

function getBlockHash(block: WSBlockUpdate): string {
  return block.hash || block.blockHash || "";
}

// ---------------------------------------------------------------------------
// Token metadata — colored dots, no emojis
// ---------------------------------------------------------------------------

const TOKEN_META: Record<
  string,
  { dotColor: string; label: string; defaultPrice: number }
> = {
  OKB: {
    dotColor: "#3B82F6",
    label: "OKB",
    defaultPrice: 52.0,
  },
  PUSDC: {
    dotColor: "#34D399",
    label: "PUSDC",
    defaultPrice: 1.0,
  },
  PWETH: {
    dotColor: "#818CF8",
    label: "PWETH",
    defaultPrice: 2500.0,
  },
};

// Allocation ring color mapping
const ALLOC_COLORS = ["#3B82F6", "#34D399", "#818CF8", "#F59E0B"];

// ---------------------------------------------------------------------------
// Allocation Donut SVG
// ---------------------------------------------------------------------------

function AllocationDonut({
  segments,
}: {
  segments: { label: string; pct: number; color: string }[];
}) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  let accOffset = 0;

  return (
    <svg viewBox="0 0 96 96" className="w-[72px] h-[72px] alloc-ring">
      {/* bg ring */}
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="rgba(75,85,99,0.15)"
        strokeWidth="6"
      />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circumference;
        const offset = -accOffset;
        accOffset += dash;
        return (
          <circle
            key={i}
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Feature 3 — Sparkline mini-chart
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  color,
  width = 48,
  height = 16,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {/* Glow line (hover reveal) */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        className="sparkline-glow"
        style={{ filter: `blur(3px)` }}
      />
      {/* Main line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-path"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const [balances, setBalances] = useState<
    { token: string; balance: string }[]
  >([]);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestBlock, setLatestBlock] = useState<WSBlockUpdate | null>(null);
  const [recentDCA, setRecentDCA] = useState<WSDCAUpdate[]>([]);
  const [expandMeta, setExpandMeta] = useState(false);
  const [expandAnalytics, setExpandAnalytics] = useState(false);
  const [analyticsSession, setAnalyticsSession] = useState<string | null>(null);
  const [economyData, setEconomyData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [rebalancer, setRebalancer] = useState<RebalancerStatus | null>(null);
  const [rebalanceEvents, setRebalanceEvents] = useState<WSRebalanceEvent[]>(
    []
  );
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  const [treasury, setTreasury] = useState<TreasuryStatus | null>(null);
  const [liveTxFeed, setLiveTxFeed] = useState<Array<{ txHash: string; label: string; time: number }>>([]);

  // Feature 3 — Price history for sparklines
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({
    OKB: [],
    PUSDC: [],
    PWETH: [],
  });

  // Feature 5 — Track balance changes for flash animations
  const prevBalancesRef = useRef<Record<string, number>>({});
  const [balanceFlash, setBalanceFlash] = useState<Record<string, "up" | "down" | null>>({});
  const [netWorthFlash, setNetWorthFlash] = useState(false);

  // Get effective price for a token
  const getPrice = useCallback(
    (token: string) => {
      return livePrices[token] ?? TOKEN_META[token]?.defaultPrice ?? 0;
    },
    [livePrices]
  );

  // Compute total USD value
  const totalUSD = useMemo(() => {
    return balances.reduce((sum, b) => {
      const price = getPrice(b.token);
      return sum + parseFloat(b.balance) * price;
    }, 0);
  }, [balances, getPrice]);

  // Allocation segments for donut
  const allocSegments = useMemo(() => {
    if (totalUSD === 0) return [];
    return balances.map((b, i) => {
      const usd = parseFloat(b.balance) * getPrice(b.token);
      return {
        label: b.token,
        pct: (usd / totalUSD) * 100,
        color:
          TOKEN_META[b.token]?.dotColor || ALLOC_COLORS[i % ALLOC_COLORS.length],
      };
    });
  }, [balances, totalUSD, getPrice]);

  // Unified activity feed
  const activityFeed = useMemo(() => {
    type FeedItem = {
      id: string;
      kind: "trade" | "rebalance" | "dca";
      text: string;
      time: number;
      txHash?: string;
    };
    const items: FeedItem[] = [];

    (Array.isArray(trades) ? trades : []).slice(0, 8).forEach((t, i) => {
      items.push({
        id: `trade-${t.id || i}`,
        kind: "trade",
        text: `${parseFloat(t.amountIn).toFixed(4)} ${t.fromToken} → ${parseFloat(t.amountOut).toFixed(4)} ${t.toToken}`,
        time: new Date(t.timestamp).getTime(),
        txHash: t.txHash,
      });
    });

    rebalanceEvents
      .filter((e) => e.action !== "check_only")
      .slice(0, 5)
      .forEach((e, i) => {
        items.push({
          id: `rb-${i}`,
          kind: "rebalance",
          text: e.reason.substring(0, 55),
          time: Date.now() - i * 60000,
        });
      });

    recentDCA.slice(0, 5).forEach((e, i) => {
      items.push({
        id: `dca-${i}`,
        kind: "dca",
        text: `${e.amountIn} ${e.fromToken} → ${e.amountOut} ${e.toToken}`,
        time: Date.now() - i * 30000,
        txHash: e.txHash,
      });
    });

    return items.sort((a, b) => b.time - a.time).slice(0, 10);
  }, [trades, rebalanceEvents, recentDCA]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [balData, infoData, healthData, pricesData, tradesData, rbData, treasuryData] =
        await Promise.all([
          getBalances().catch(() => null),
          getAgentInfo().catch(() => null),
          getHealth().catch(() => null),
          getPrices().catch(() => null),
          getTradeHistory().catch(() => null),
          getRebalancerStatus().catch(() => null),
          getTreasuryStatus().catch(() => null),
        ]);

      // Feature 5 — detect balance changes for flash animation
      if (balData?.balances) {
        const newBals: Record<string, number> = {};
        const flashes: Record<string, "up" | "down" | null> = {};
        let anyChange = false;
        balData.balances.forEach((b) => {
          const newVal = parseFloat(b.balance);
          newBals[b.token] = newVal;
          const oldVal = prevBalancesRef.current[b.token];
          if (oldVal !== undefined && oldVal !== newVal) {
            flashes[b.token] = newVal > oldVal ? "up" : "down";
            anyChange = true;
          }
        });
        if (anyChange) {
          setBalanceFlash(flashes);
          setNetWorthFlash(true);
          setTimeout(() => {
            setBalanceFlash({});
            setNetWorthFlash(false);
          }, 1200);
        }
        prevBalancesRef.current = newBals;
        setBalances(balData.balances);
      }

      if (infoData) setAgentInfo(infoData);
      if (healthData) setHealth(healthData);

      // Feature 3 — accumulate price history for sparklines
      if (pricesData) {
        setLivePrices(pricesData);
        setPriceHistory((prev) => {
          const next = { ...prev };
          for (const token of Object.keys(pricesData)) {
            const arr = [...(prev[token] || []), pricesData[token]];
            next[token] = arr.slice(-20); // keep last 20 data points
          }
          return next;
        });
      }

      if (Array.isArray(tradesData)) setTrades(tradesData);
      if (rbData) setRebalancer(rbData);
      if (treasuryData) setTreasury(treasuryData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket for live block + DCA events
  useEffect(() => {
    const ws = createWebSocket((event: WSEvent) => {
      if (event.type === "newBlock") {
        setLatestBlock(event);
        setShowHeartbeat(true);
        setTimeout(() => setShowHeartbeat(false), 900);
      }
      if (event.type === "dcaExecution") {
        setRecentDCA((prev) => [event, ...prev].slice(0, 5));
        setLiveTxFeed((prev) => [{ txHash: event.txHash, label: `DCA ${event.fromToken}→${event.toToken}`, time: Date.now() }, ...prev].slice(0, 5));
        setTimeout(fetchData, 1000);
      }
      if (event.type === "rebalance") {
        setRebalanceEvents((prev) => [event, ...prev].slice(0, 5));
        if (event.action !== "check_only" && event.trade?.txHash) {
          setLiveTxFeed((prev) => [{ txHash: event.trade!.txHash, label: `Rebalance ${event.action}`, time: Date.now() }, ...prev].slice(0, 5));
          setTimeout(fetchData, 1000);
        }
      }
      if (event.type === "heartbeat") {
        setLiveTxFeed((prev) => [{ txHash: (event as any).txHash, label: `Heartbeat #${(event as any).count}`, time: Date.now() }, ...prev].slice(0, 5));
      }
    });
    return () => ws.close();
  }, [fetchData]);

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Copy address
  const copyAddress = () => {
    if (!agentInfo) return;
    navigator.clipboard.writeText(agentInfo.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Unlock x402 analytics
  const unlockAnalytics = async () => {
    if (analyticsSession) return;
    setLoadingAnalytics(true);
    try {
      const result = await payForAnalytics("economy-loop", "demo");
      setAnalyticsSession(result.sessionId);
      const data = await getAnalytics("economy-loop", result.sessionId);
      setEconomyData((data as any).data);
    } catch (err) {
      console.error("x402 payment failed:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const shortAddr = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const feedBorderClass = {
    trade: "feed-trade",
    rebalance: "feed-rebalance",
    dca: "feed-dca",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Heartbeat line on new block */}
      {showHeartbeat && <div className="heartbeat-line" />}

      {/* ════════════ ZONE 1: Identity Strip ════════════ */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-800/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PulseRingLogo size={36} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-[1.5px] border-[#0A0E1A] pulse-dot" />
          </div>
          <div className="flex-1 min-w-0">
            <Wordmark size="text-sm" />
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-gray-500">
                AI Agent · X Layer Testnet
              </p>
            </div>
          </div>
        </div>

        {/* Wallet address */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-3 h-3 text-gray-500" />
            {agentInfo ? (
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 group"
              >
                <span className="font-mono text-[11px] text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
                  {shortAddr(agentInfo.address)}
                </span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
                )}
              </button>
            ) : (
              <div className="h-3 w-24 skeleton rounded" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {agentInfo && (
              <a
                href={`https://www.oklink.com/xlayer-test/address/${agentInfo.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-gray-600 hover:text-cyan-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* ════════════ ZONE 2: Portfolio ════════════ */}
        <div className="space-y-3">
          {/* Net worth + Donut */}
          {!loading && balances.length > 0 && (
            <div className="flex items-center gap-3">
              <AllocationDonut segments={allocSegments} />
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Net Worth
                </span>
                <div className={`text-lg font-bold text-white font-mono count-up ${netWorthFlash ? "trade-flash" : ""}`}>
                  $
                  {totalUSD.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                {/* Allocation legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  {allocSegments.map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center gap-1 text-[10px] text-gray-400"
                    >
                      <span
                        className="token-dot"
                        style={{ color: seg.color, backgroundColor: seg.color }}
                      />
                      {seg.pct.toFixed(0)}%
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Token rows */}
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 skeleton rounded-lg" />
              ))}
            </div>
          ) : balances.length > 0 ? (
            <div className="space-y-1">
              <AnimatePresence>
                {balances.map((b, idx) => {
                  const meta = TOKEN_META[b.token];
                  const dotColor = meta?.dotColor || "#6B7280";
                  const bal = parseFloat(b.balance);
                  const tokenPrice = getPrice(b.token);
                  const usd = bal * tokenPrice;
                  const flash = balanceFlash[b.token];
                  const sparkData = priceHistory[b.token] || [];
                  return (
                    <motion.div
                      key={b.token}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/[0.03] transition-all group cursor-default ${
                        flash ? (flash === "up" ? "border-l-2 border-emerald-400/40" : "border-l-2 border-red-400/40") : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="token-dot"
                          style={{
                            color: dotColor,
                            backgroundColor: dotColor,
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-200">
                            {b.token}
                          </span>
                          {tokenPrice > 0 && (
                            <span className="text-[10px] text-gray-600 font-mono">
                              ${tokenPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Feature 3 — Sparkline */}
                        <Sparkline data={sparkData} color={dotColor} />
                        <div className="text-right">
                          <div className={`text-xs font-mono text-white ${
                            flash === "up" ? "value-flash-up" : flash === "down" ? "value-flash-down" : ""
                          }`}>
                            {bal.toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}
                          </div>
                          {usd > 0 && (
                            <div className="text-[10px] font-mono text-gray-500">
                              ≈ $
                              {usd.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">
              No balances found
            </p>
          )}

          {/* Rebalancer status strip */}
          <div className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/10">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                {rebalancer?.running && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full pulse-dot-cyan" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                Rebalancer
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-cyan-400 font-medium">
                {rebalancer?.running ? "Active" : "Paused"}
              </span>
              {rebalancer && (
                <span className="text-gray-600 font-mono">
                  {rebalancer.rebalanceCount} trades
                </span>
              )}
            </div>
          </div>

          {/* ── Economy Loop Flow ─────────────────────────── */}
          <div className="rounded-xl border border-emerald-800/20 overflow-hidden bg-emerald-500/[0.02]">
            <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">
              <RefreshCw className="w-3 h-3" />
              Economy Loop
            </div>
            <div className="px-3 pb-2.5">
              {/* Flow diagram */}
              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-2">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">⚡</span>
                  <span>Swap</span>
                </div>
                <span className="text-emerald-500/40">→</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">💰</span>
                  <span>Fee</span>
                </div>
                <span className="text-emerald-500/40">→</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">🏦</span>
                  <span>Treasury</span>
                </div>
                <span className="text-emerald-500/40">→</span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">♻️</span>
                  <span>Reinvest</span>
                </div>
              </div>
              {/* Treasury stats */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Sweeps</span>
                  <span className="text-emerald-400 font-mono">{treasury?.sweepCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending PUSDC</span>
                  <span className="text-amber-400 font-mono">{(treasury?.pendingFeesPUSDC ?? 0).toFixed(4)}</span>
                </div>
                {treasury?.sweepHistory && treasury.sweepHistory.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-800/30">
                    <span className="text-[9px] text-gray-600">Last sweep:</span>
                    <a
                      href={`https://www.oklink.com/xlayer-test/tx/${treasury.sweepHistory[treasury.sweepHistory.length - 1].txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] text-cyan-400/60 hover:text-cyan-400 font-mono"
                    >
                      {treasury.sweepHistory[treasury.sweepHistory.length - 1].amount} {treasury.sweepHistory[treasury.sweepHistory.length - 1].token}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
                {/* Always show an on-chain verification link */}
                {agentInfo && (
                  <div className={`${treasury?.sweepHistory?.length ? "mt-1" : "mt-1 pt-1 border-t border-gray-800/30"}`}>
                    <a
                      href={`https://www.oklink.com/xlayer-test/address/${agentInfo.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] text-cyan-400/50 hover:text-cyan-400 transition-colors"
                    >
                      Verify on-chain
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Live TX Feed ──────────────────────────────── */}
          {liveTxFeed.length > 0 && (
            <div className="rounded-xl border border-gray-800/30 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <Activity className="w-3 h-3 text-emerald-500" />
                Live Agent Txns
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {liveTxFeed.map((tx, i) => (
                  <a
                    key={`${tx.txHash}-${i}`}
                    href={`https://www.oklink.com/xlayer-test/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-gray-400 truncate">{tx.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-mono text-gray-600">{tx.txHash.slice(0, 8)}…</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-700 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════════ ZONE 3: Unified Activity Feed ════════════ */}
        {activityFeed.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">
              <ArrowRightLeft className="w-3 h-3" />
              Activity
            </div>
            <div className="space-y-1">
              {activityFeed.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`${feedBorderClass[item.kind]} py-1.5 pl-2.5 pr-2 rounded-r-md flex items-center justify-between`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-300 truncate">
                      {item.text}
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {new Date(item.time).toLocaleTimeString()}
                    </span>
                  </div>
                  {item.txHash && (
                    <a
                      href={`https://www.oklink.com/xlayer-test/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-cyan-400 transition-colors flex-shrink-0 ml-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Flashblock ticker — subtle */}
        {latestBlock && (
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-white/[0.02] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot flex-shrink-0" />
            <span className="text-gray-500">Block</span>
            <span className="font-mono text-emerald-400/70 flash-in">
              #{parseBlockNum(latestBlock).toLocaleString()}
            </span>
            <span className="text-gray-700 ml-auto font-mono">
              {getBlockHash(latestBlock).slice(0, 8)}…
            </span>
          </div>
        )}

        {/* ── x402 Economy ────────────────────────────────── */}
        <div className="rounded-xl border border-amber-800/15 overflow-hidden x402-badge">
          <button
            onClick={() => {
              setExpandAnalytics(!expandAnalytics);
              if (!analyticsSession && !expandAnalytics) unlockAnalytics();
            }}
            className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 text-amber-400/80">
              <BarChart3 className="w-3 h-3" />
              x402 Economy
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              {analyticsSession ? (
                <Unlock className="w-3 h-3 text-emerald-500" />
              ) : (
                <Lock className="w-3 h-3 text-amber-500/60" />
              )}
              {expandAnalytics ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {expandAnalytics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2.5 space-y-2">
                  {loadingAnalytics ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-3 skeleton rounded w-full" />
                      ))}
                    </div>
                  ) : analyticsSession && economyData ? (
                    <>
                      <div className="flex items-center gap-1.5 py-1 px-2 rounded bg-amber-500/[0.06] border border-amber-500/10">
                        <DollarSign className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-amber-400/80 font-medium">
                          Premium · 0.50 PUSDC
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <Row
                          label="Trading Fees"
                          value={
                            economyData.revenue?.tradingFees?.totalUSD ||
                            "$0.00"
                          }
                          accent
                        />
                        <Row
                          label="x402 Revenue"
                          value={
                            economyData.revenue?.x402Revenue?.totalUSD ||
                            "$0.00"
                          }
                          accent
                        />
                        <div className="h-1 bg-gray-800/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 revenue-bar"
                            style={
                              {
                                "--fill": `${Math.min(
                                  100,
                                  (parseFloat(
                                    (
                                      economyData.revenue?.totalRevenueUSD ||
                                      "$0"
                                    ).replace("$", "")
                                  ) /
                                    10) *
                                    100
                                )}%`,
                              } as React.CSSProperties
                            }
                          />
                        </div>
                        <Row
                          label="Total"
                          value={
                            economyData.revenue?.totalRevenueUSD || "$0.00"
                          }
                          highlight
                        />
                        <Row
                          label="Trades"
                          value={String(
                            economyData.activity?.totalTransactions || 0
                          )}
                        />
                        {/* On-chain verification link */}
                        {agentInfo && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-800/30">
                            <a
                              href={`https://www.oklink.com/xlayer-test/address/${agentInfo.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] text-amber-400/50 hover:text-amber-400 transition-colors"
                            >
                              Verify on-chain
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3 space-y-2">
                      <Lock className="w-4 h-4 text-amber-500/40 mx-auto" />
                      <p className="text-[10px] text-gray-600">
                        Gated — 0.50 PUSDC
                      </p>
                      <button
                        onClick={unlockAnalytics}
                        className="text-[10px] bg-amber-500/8 text-amber-400 px-3 py-1.5 rounded-md hover:bg-amber-500/15 transition-all border border-amber-500/15"
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Tech Meta (collapsed) ───────────────────────── */}
        <div className="rounded-xl border border-gray-800/40 overflow-hidden">
          <button
            onClick={() => setExpandMeta(!expandMeta)}
            className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3" />
              Tech Stack
            </div>
            {expandMeta ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          <AnimatePresence>
            {expandMeta && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2.5 space-y-1.5 text-[11px]">
                  <Row label="Network" value="X Layer Testnet" />
                  <Row label="Chain ID" value="1952" mono />
                  <Row
                    label="Builder"
                    value={health?.builderCode || "PULSETRDRV1XLYR0"}
                    mono
                  />
                  <Row label="LLM" value="Groq · Llama 3.3 70B" />
                  <Row label="Blocks" value="200ms Flashblocks" accent />
                  <Row label="Skills" value="OnchainOS MCP" />
                  <Row label="x402" value="Premium Analytics" />
                  <Row label="Standard" value="ERC-8021" mono />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer Status ─────────────────────────────────── */}
      <div className="px-4 py-2.5 mt-auto border-t border-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${health ? "bg-emerald-500 pulse-dot" : "bg-red-500"}`}
            />
            <span>{health ? "Connected" : "Offline"}</span>
          </div>
          {health?.flashblocksConnected && (
            <div className="flex items-center gap-1 text-[9px] text-emerald-500/70 font-medium font-mono">
              <Activity className="w-2.5 h-2.5" />
              WSS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  mono,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span
        className={`text-[10px] ${
          highlight
            ? "text-white font-semibold text-[11px]"
            : accent
              ? "text-cyan-400"
              : "text-gray-300"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
