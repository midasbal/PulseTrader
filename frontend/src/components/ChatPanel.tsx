"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  RotateCcw,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Timer,
  Sparkles,
  Wrench,
  ChevronRight,
  ExternalLink,
  Zap,
  CheckCircle2,
  Circle,
} from "lucide-react";
import PulseRingLogo from "@/components/PulseRingLogo";
import {
  sendChat,
  resetSession,
  createWebSocket,
  getPrices,
  type WSEvent,
  type WSBlockUpdate,
  type ToolTrace,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  isX402?: boolean;
  toolCalls?: ToolTrace[];
  swapData?: SwapCardData | null;
}

interface SwapCardData {
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  rate: string;
  fee: string;
  txHash: string;
  explorerUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function linkifyTxHash(text: string): string {
  // First: convert bare oklink URLs to markdown links
  let result = text.replace(
    /https:\/\/www\.oklink\.com\/xlayer-test\/tx\/(0x[a-fA-F0-9]+)/g,
    "[$1](https://www.oklink.com/xlayer-test/tx/$1)"
  );
  // Second: fix relative explorer links like [View](tx/0x...) or [View](/tx/0x...)
  result = result.replace(
    /\]\(\/?tx\/(0x[a-fA-F0-9]+)\)/g,
    "](https://www.oklink.com/xlayer-test/tx/$1)"
  );
  // Third: catch standalone 0x hashes that aren't already linked (preceded by word boundary, not inside markdown link)
  result = result.replace(
    /(?<!\[|\/)(0x[a-fA-F0-9]{64})(?!\]|\))/g,
    "[$1](https://www.oklink.com/xlayer-test/tx/$1)"
  );
  return result;
}

function isX402Response(content: string): boolean {
  return (
    content.includes("x402") ||
    content.includes("premium") ||
    content.includes("economy loop") ||
    content.includes("pool analytics")
  );
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

/** Safely parse a hex block number from WSBlockUpdate (handles both `number` and `blockNumber` fields) */
function parseBlockNum(block: WSBlockUpdate): number {
  const raw = block.number || block.blockNumber || "0x0";
  const n = parseInt(raw, 16);
  return isNaN(n) ? 0 : n;
}

/** Safely get block hash */
function getBlockHash(block: WSBlockUpdate): string {
  return block.hash || block.blockHash || "";
}

/** Parse swap execution data from agent response text */
function parseSwapData(content: string): SwapCardData | null {
  const swapMatch = content.match(
    /(?:swapped|traded|executed)[:\s]*([0-9.,]+)\s+(\w+)\s+(?:for|→|->)\s+([0-9.,]+)\s+(\w+)/i
  );
  if (!swapMatch) return null;

  const txMatch = content.match(/(0x[a-fA-F0-9]{64})/);
  const feeMatch = content.match(/fee[:\s]*([0-9.,]+)\s*(\w+)?/i);
  const rateMatch = content.match(/rate[:\s]*([0-9.,]+)/i);

  const amountIn = swapMatch[1];
  const fromToken = swapMatch[2];
  const amountOut = swapMatch[3];
  const toToken = swapMatch[4];

  return {
    fromToken,
    toToken,
    amountIn,
    amountOut,
    rate: rateMatch?.[1] || (parseFloat(amountIn) / parseFloat(amountOut)).toFixed(2),
    fee: feeMatch ? `${feeMatch[1]} ${feeMatch[2] || fromToken}` : `${(parseFloat(amountIn) * 0.001).toFixed(6)} ${fromToken}`,
    txHash: txMatch?.[1] || "",
    explorerUrl: txMatch ? `https://www.oklink.com/xlayer-test/tx/${txMatch[1]}` : "",
  };
}

const TOKEN_DOTS: Record<string, string> = {
  OKB: "#3B82F6",
  PUSDC: "#34D399",
  PWETH: "#818CF8",
};

// ---------------------------------------------------------------------------
// Feature 4 — Refined Command Center (4 actions)
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    label: "Check Prices",
    desc: "Live OKB, PUSDC & PWETH",
    prompt: "What are the current prices?",
    gradient: "from-blue-500/12 to-cyan-600/6",
    hoverBorder: "hover:border-blue-500/20",
    iconColor: "group-hover:text-blue-400",
  },
  {
    icon: <ArrowRightLeft className="w-5 h-5" />,
    label: "Swap Tokens",
    desc: "Trade on X Layer",
    prompt: "Swap 100 PUSDC for PWETH",
    gradient: "from-cyan-500/12 to-emerald-600/6",
    hoverBorder: "hover:border-cyan-500/20",
    iconColor: "group-hover:text-cyan-400",
  },
  {
    icon: <Timer className="w-5 h-5" />,
    label: "Set Up DCA",
    desc: "Automated dollar-cost avg",
    prompt: "Set up a DCA buying 50 PUSDC of PWETH every 60 seconds, 5 times",
    gradient: "from-amber-500/12 to-yellow-600/6",
    hoverBorder: "hover:border-amber-500/20",
    iconColor: "group-hover:text-amber-400",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    label: "Portfolio",
    desc: "Balances & allocation",
    prompt: "What's my portfolio?",
    gradient: "from-emerald-500/12 to-green-600/6",
    hoverBorder: "hover:border-emerald-500/20",
    iconColor: "group-hover:text-emerald-400",
  },
];

// ---------------------------------------------------------------------------
// Tool Labels
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, { icon: typeof Zap; label: string }> = {
  get_balances: { icon: Wallet, label: "Checking balances" },
  get_swap_quote: { icon: ArrowRightLeft, label: "Getting swap quote" },
  execute_swap: { icon: Zap, label: "Executing swap" },
  get_agent_info: { icon: Circle, label: "Loading agent info" },
  get_market_price: { icon: TrendingUp, label: "Fetching market price" },
  get_batch_prices: { icon: TrendingUp, label: "Fetching batch prices" },
  get_dex_quote: { icon: ArrowRightLeft, label: "Getting DEX quote" },
  search_token: { icon: Circle, label: "Searching tokens" },
  get_portfolio: { icon: Wallet, label: "Loading portfolio" },
  get_gas_price: { icon: Zap, label: "Checking gas price" },
  get_premium_analytics: { icon: Sparkles, label: "Premium analytics (x402)" },
  get_x402_pricing: { icon: Sparkles, label: "x402 pricing" },
  get_uniswap_pools: { icon: Circle, label: "Searching Uniswap pools" },
  get_token_liquidity: { icon: Circle, label: "Checking liquidity" },
  get_rebalancer_status: { icon: ArrowRightLeft, label: "Checking rebalancer" },
  create_dca: { icon: Timer, label: "Creating DCA schedule" },
  manage_dca: { icon: Timer, label: "Managing DCA schedule" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `s-${Date.now()}`);
  const [latestBlock, setLatestBlock] = useState<WSBlockUpdate | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const ws = createWebSocket(
      (event: WSEvent) => {
        if (event.type === "newBlock") setLatestBlock(event);
      },
      (connected) => setWsConnected(connected)
    );
    return () => ws.close();
  }, []);

  // Fetch prices for welcome ticker
  useEffect(() => {
    getPrices().then(setLivePrices).catch(() => {});
    const id = setInterval(() => {
      getPrices().then(setLivePrices).catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    },
    []
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const msg = input.trim();
      if (!msg || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      setIsLoading(true);

      try {
        const response = await sendChat(msg, sessionId);
        const swapData = parseSwapData(response.reply);
        const agentMsg: Message = {
          id: `a-${Date.now()}`,
          role: "agent",
          content: response.reply,
          timestamp: Date.now(),
          isX402: isX402Response(response.reply),
          toolCalls: response.toolCalls,
          swapData,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        const errorMsg: Message = {
          id: `e-${Date.now()}`,
          role: "agent",
          content: `❌ **Error:** ${err instanceof Error ? err.message : "Something went wrong. Is the backend running?"}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, sessionId]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      sendChat(prompt, sessionId)
        .then((response) => {
          const swapData = parseSwapData(response.reply);
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "agent",
              content: response.reply,
              timestamp: Date.now(),
              isX402: isX402Response(response.reply),
              toolCalls: response.toolCalls,
              swapData,
            },
          ]);
        })
        .catch((err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: "agent",
              content: `❌ **Error:** ${err instanceof Error ? err.message : "Unknown error"}`,
              timestamp: Date.now(),
            },
          ]);
        })
        .finally(() => {
          setIsLoading(false);
          setInput("");
        });
    },
    [sessionId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleReset = useCallback(async () => {
    await resetSession(sessionId);
    setMessages([]);
  }, [sessionId]);

  const showWelcome = messages.length === 0 && !isLoading;

  const tickerItems = useMemo(() => {
    const items: { label: string; value: string; color: string }[] = [];
    if (livePrices.OKB) items.push({ label: "OKB", value: `$${livePrices.OKB}`, color: "#3B82F6" });
    if (livePrices.PUSDC) items.push({ label: "PUSDC", value: `$${livePrices.PUSDC}`, color: "#34D399" });
    if (livePrices.PWETH) items.push({ label: "PWETH", value: `$${livePrices.PWETH?.toLocaleString()}`, color: "#818CF8" });
    if (latestBlock) items.push({ label: "Block", value: `#${parseBlockNum(latestBlock).toLocaleString()}`, color: "#22D3EE" });
    items.push({ label: "Confirmation", value: "200ms", color: "#34D399" });
    items.push({ label: "Agent", value: "◉ Live", color: "#34D399" });
    return items;
  }, [livePrices, latestBlock]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/30 bg-[#0A0E1A] shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <PulseRingLogo size={28} />
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">
              PulseTrader<span className="text-emerald-400">+</span>
            </h1>
            <p className="text-[10px] text-gray-500">AI Trading Agent · X Layer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latestBlock && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 glass rounded-md flash-in">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                <span className="text-emerald-400/70">
                  #{parseBlockNum(latestBlock).toLocaleString()}
                </span>
              </span>
            </div>
          )}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border ${
              wsConnected
                ? "bg-emerald-500/[0.06] text-emerald-400/80 border-emerald-500/10"
                : "bg-red-500/[0.06] text-red-400/80 border-red-500/10"
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${wsConnected ? "bg-emerald-500 pulse-dot" : "bg-red-500"}`} />
            {wsConnected ? "Live" : "Off"}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-all"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          /* ═══ FEATURE 4: Refined Command Center ═══════ */
          <div className="flex flex-col items-center justify-center h-full px-4 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center mb-8"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 blur-2xl opacity-30">
                  <PulseRingLogo size={80} />
                </div>
                <div className="relative float-slow">
                  <PulseRingLogo size={80} animate />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
                <span className="text-cyan-400">Pulse</span>Trader
                <span className="text-emerald-400">+</span>
              </h2>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                Autonomous trading on X Layer.{" "}
                <span className="text-cyan-400 font-medium">200ms</span>{" "}
                confirmation.
              </p>

              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {["OnchainOS", "x402", "ERC-8021", "Flashblocks"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-gray-800/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* 2×2 Action Cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 gap-3 w-full max-w-md"
            >
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  onClick={() => handleSuggestion(s.prompt)}
                  disabled={isLoading}
                  className={`action-card group flex flex-col items-start gap-1.5 p-4 rounded-xl border border-gray-800/40 bg-gradient-to-br ${s.gradient} ${s.hoverBorder} text-left cursor-pointer`}
                >
                  <span className={`text-gray-500 transition-colors ${s.iconColor}`}>
                    {s.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-200 group-hover:text-white transition-colors">
                    {s.label}
                  </span>
                  <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors leading-snug">
                    {s.desc}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            {/* ── Live Ticker Strip ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 w-full max-w-md overflow-hidden live-ticker-strip"
            >
              <div className="flex items-center gap-6 ticker-scroll whitespace-nowrap">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-mono text-gray-300">{item.value}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          /* ── Message List ─────────────────────────────── */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "agent" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600/15 to-indigo-600/10 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0 border border-cyan-500/10">
                      <PulseRingLogo size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words overflow-hidden ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-br-md shadow-lg shadow-cyan-500/10"
                        : `bg-gray-800/50 text-gray-100 rounded-bl-md border ${
                            msg.isX402
                              ? "border-amber-700/30 bg-gradient-to-br from-gray-800/50 to-amber-950/10"
                              : "border-gray-700/30"
                          }`
                    }`}
                  >
                    {msg.role === "agent" && msg.isX402 && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-amber-700/20">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-400">
                          Premium Analytics (x402)
                        </span>
                      </div>
                    )}

                    {/* ═══ FEATURE 1: Rich Swap Confirmation Card ═══ */}
                    {msg.role === "agent" && msg.swapData && (
                      <SwapConfirmationCard data={msg.swapData} />
                    )}

                    {msg.role === "agent" ? (
                      <div className="agent-markdown">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              // Fix relative explorer links at render time
                              let fixedHref = href || "";
                              if (/^\/?tx\/0x/i.test(fixedHref)) {
                                fixedHref = `https://www.oklink.com/xlayer-test/${fixedHref.replace(/^\//, "")}`;
                              }
                              return (
                                <a href={fixedHref} target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {linkifyTxHash(msg.content)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}

                    {/* ═══ FEATURE 2: Tool Trace Timeline ═══ */}
                    {msg.role === "agent" && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <ToolTraceTimeline traces={msg.toolCalls} />
                    )}

                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-cyan-200/40" : "text-gray-600"
                      }`}
                    >
                      {timeAgo(msg.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ═══ FEATURE 2: Agent Thinking Timeline ═══ */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600/15 to-indigo-600/10 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0 border border-cyan-500/10">
                  <PulseRingLogo size={16} />
                </div>
                <div className="bg-gray-800/50 border border-gray-700/30 rounded-2xl rounded-bl-md px-4 py-3.5 min-w-[200px]">
                  <AgentThinkingTimeline />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ───────────────────────────────────────── */}
      <div className="border-t border-gray-800/30 bg-[#0A0E1A] px-4 py-3 shrink-0 relative z-10">
        <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="input-ring flex items-end gap-2.5 bg-gray-800/40 border border-gray-700/30 rounded-xl px-3.5 py-2.5 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything — prices, swaps, DCA, portfolio..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none py-1 max-h-[120px]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-send flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-600 text-white shadow-lg shadow-cyan-500/10 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] text-gray-600">Powered by</span>
              {["Groq", "OnchainOS", "Flashblocks", "ERC-8021"].map((t, i) => (
                <span key={t} className="leading-none">
                  <span className="text-[9px] text-gray-500">{t}</span>
                  {i < 3 && <span className="text-[9px] text-gray-700 mx-0.5">·</span>}
                </span>
              ))}
            </div>
            <a
              href="https://x.com/wjmdiary"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center w-5 h-5 rounded-md hover:bg-white/[0.04] transition-all duration-200"
              title="Follow on X"
            >
              <svg
                className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_4px_rgba(0,255,255,0.5)] transition-all duration-200"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 1 — Swap Confirmation Card
// ---------------------------------------------------------------------------

function SwapConfirmationCard({ data }: { data: SwapCardData }) {
  const fromColor = TOKEN_DOTS[data.fromToken] || "#9CA3AF";
  const toColor = TOKEN_DOTS[data.toToken] || "#9CA3AF";

  return (
    <div className="swap-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          Trade Executed
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: fromColor, boxShadow: `0 0 8px ${fromColor}40` }}
          />
          <div>
            <div className="text-lg font-bold text-white font-mono">
              {parseFloat(data.amountIn).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
            <div className="text-[10px] text-gray-500">{data.fromToken}</div>
          </div>
        </div>

        <div className="flex-1 mx-4 flex flex-col items-center gap-1">
          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          <div className="swap-flow-line w-full rounded-full" />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-bold text-white font-mono">
              {parseFloat(data.amountOut).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </div>
            <div className="text-[10px] text-gray-500">{data.toToken}</div>
          </div>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: toColor, boxShadow: `0 0 8px ${toColor}40` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] mb-3 py-2 border-t border-b border-gray-700/20">
        <div>
          <span className="text-gray-500 block">Rate</span>
          <span className="text-gray-300 font-mono">{data.rate}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Fee</span>
          <span className="text-gray-300 font-mono">{data.fee}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Speed</span>
          <span className="text-emerald-400 font-mono">200ms</span>
        </div>
      </div>

      {data.txHash && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-gray-500 truncate max-w-[180px]">
            {data.txHash.slice(0, 10)}…{data.txHash.slice(-8)}
          </span>
          <a
            href={data.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View on OKLink
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 2 — Agent Thinking Timeline (loading state)
// ---------------------------------------------------------------------------

const THINKING_STEPS = [
  { label: "Parsing your request", delay: 0 },
  { label: "Selecting tools", delay: 800 },
  { label: "Executing on X Layer", delay: 2000 },
];

function AgentThinkingTimeline() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = THINKING_STEPS.map((step, i) =>
      setTimeout(() => setActiveStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-medium text-gray-300">Agent is working</span>
      </div>
      {THINKING_STEPS.map((step, i) => (
        <div
          key={i}
          className={`timeline-step flex items-center gap-2 text-[10px] py-1 px-2 rounded ${
            i <= activeStep ? "opacity-100" : "opacity-0"
          }`}
        >
          {i < activeStep ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          ) : i === activeStep ? (
            <span className="w-3 h-3 rounded-full bg-cyan-400 flex-shrink-0 tool-active-dot" />
          ) : (
            <Circle className="w-3 h-3 text-gray-600 flex-shrink-0" />
          )}
          <span className={i < activeStep ? "text-gray-400" : i === activeStep ? "text-cyan-300" : "text-gray-600"}>
            {step.label}
          </span>
          {i < activeStep && (
            <span className="text-gray-600 ml-auto font-mono">✓</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 2 — Tool Trace Timeline (post-response)
// ---------------------------------------------------------------------------

function ToolTraceTimeline({ traces }: { traces: ToolTrace[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 pt-2 border-t border-gray-700/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
      >
        <Wrench className="w-3 h-3" />
        <span>
          {traces.length} tool{traces.length > 1 ? "s" : ""} used
        </span>
        <ChevronRight
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 space-y-0.5">
              {traces.map((t, i) => {
                const meta = TOOL_LABELS[t.name];
                const Icon = meta?.icon || Circle;
                return (
                  <div
                    key={i}
                    className="timeline-step text-[10px] text-gray-500 py-1.5 px-2 rounded bg-white/[0.02] border border-gray-800/30 flex items-center gap-2"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400/70 flex-shrink-0" />
                    <Icon className="w-3 h-3 text-cyan-400/50 flex-shrink-0" />
                    <span className="text-gray-400">{meta?.label || t.name}</span>
                    {Object.keys(t.args).length > 0 && (
                      <span className="text-gray-600 ml-auto font-mono truncate max-w-[120px]">
                        {Object.entries(t.args)
                          .map(([k, v]) => `${k}: ${String(v).substring(0, 16)}`)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
