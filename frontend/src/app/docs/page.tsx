"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Shield,
  Layers,
  Brain,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Terminal,
  Workflow,
  Coins,
  Lock,
  Cpu,
  Globe,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  id,
  children,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  id: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="border border-gray-800/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <span className="text-lg font-semibold text-white tracking-tight flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {open && <div className="px-6 pb-6 space-y-4 text-gray-300 text-sm leading-relaxed">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function Stat({ label, value, accent = "cyan" }: { label: string; value: string; accent?: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-400 border-cyan-500/20 bg-cyan-500/[0.04]",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.04]",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/[0.04]",
    purple: "text-purple-400 border-purple-500/20 bg-purple-500/[0.04]",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[accent]}`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${colors[accent]?.split(" ")[0]}`}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-gray-100">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/40 glass">
        <div className="max-w-4xl mx-auto flex items-center gap-4 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="flex-1" />
          <span className="text-sm font-semibold tracking-tight">
            <span className="text-cyan-400">Pulse</span>Trader
            <span className="text-emerald-400">+</span>
          </span>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">Documentation</span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-cyan-400">Pulse</span>Trader
            <span className="text-emerald-400">+</span>{" "}
            <span className="text-gray-400 text-3xl md:text-4xl">Docs</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            An autonomous AI trading agent with its own wallet, real-time Flashblocks,
            OnchainOS skills, MCP composability, and an x402 micropayment economy —
            all on X Layer Testnet.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["X Layer Arena", "ERC-8021", "Flashblocks", "OnchainOS", "MCP", "x402"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-400 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
          <Stat label="Confirmation" value="200ms" accent="cyan" />
          <Stat label="Agent Tools" value="18" accent="emerald" />
          <Stat label="MCP Tools" value="14" accent="purple" />
          <Stat label="x402 Endpoints" value="6" accent="amber" />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-4">

        {/* Architecture */}
        <Section icon={Layers} title="Architecture Overview" id="architecture" defaultOpen>
          <p>
            PulseTrader+ is a three-tier system: a <strong className="text-white">Next.js 16 frontend</strong> talks to an{" "}
            <strong className="text-white">Express + WebSocket backend</strong>, which executes trades on{" "}
            <strong className="text-white">X Layer Testnet</strong> via viem.
          </p>

          {/* ── Responsive Architecture Diagram ── */}
          <div className="mt-4 space-y-3">
            {/* Frontend Layer */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-cyan-400 font-semibold text-sm">Frontend — Next.js 16 (Turbopack)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {["Chat UI", "Wallet Dashboard", "Economy Loop", "Docs Page"].map((m) => (
                  <div key={m} className="px-3 py-2 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/10 text-center text-xs text-cyan-300/80">{m}</div>
                ))}
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-0.5 text-gray-600">
                <div className="w-px h-3 bg-gray-700" />
                <span className="text-[10px] font-mono">HTTP + WebSocket</span>
                <div className="w-px h-3 bg-gray-700" />
              </div>
            </div>

            {/* Backend Layer */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Backend — Express + WS (Port 3001)</span>
              </div>
              {/* Core Modules */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {[
                  { label: "AI Agent", sub: "18 tools · LLM failover" },
                  { label: "Onchain Engine", sub: "Burn + Mint swaps" },
                  { label: "x402 Gate", sub: "6 premium endpoints" },
                  { label: "Analytics", sub: "5 reports + AI signal" },
                ].map((m) => (
                  <div key={m.label} className="px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                    <div className="text-xs text-emerald-300/90 font-medium">{m.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>
              {/* OnchainOS Bridge */}
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.04] px-4 py-3">
                <div className="text-xs text-purple-400 font-medium mb-2">OnchainOS MCP Bridge — 12 Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {["market_price", "market_prices", "swap_quote", "token_search", "defi_search", "defi_detail", "token_liquidity", "portfolio_all_balances", "gateway_gas", "swap_chains", "swap_liquidity", "portfolio_total_value"].map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-purple-500/[0.08] text-purple-400/70 text-[10px] font-mono">{s}</span>
                  ))}
                </div>
              </div>
              {/* Autonomous Loops */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 mt-2">
                <div className="text-xs text-amber-400 font-medium mb-2">Autonomous Loops (no human prompting)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {["🔄 Rebalancer 60s", "💸 Fee Sweep", "📈 DCA Reinvest", "⚡ Flashblocks WS"].map((l) => (
                    <span key={l} className="px-2 py-1 rounded bg-amber-500/[0.06] text-amber-300/70 text-[10px] text-center">{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-0.5 text-gray-600">
                <div className="w-px h-3 bg-gray-700" />
                <span className="text-[10px] font-mono">viem 2.x + Flashblocks RPC</span>
                <div className="w-px h-3 bg-gray-700" />
              </div>
            </div>

            {/* Chain Layer */}
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-orange-400 font-semibold text-sm">X Layer Testnet — Chain ID 1952</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="px-3 py-2 rounded-lg bg-orange-500/[0.06] border border-orange-500/10">
                  <div className="text-xs text-emerald-400 font-medium">PUSDC</div>
                  <div className="text-[10px] text-gray-500 font-mono break-all">0x9eb8…c72c0E</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-orange-500/[0.06] border border-orange-500/10">
                  <div className="text-xs text-purple-400 font-medium">PWETH</div>
                  <div className="text-[10px] text-gray-500 font-mono break-all">0x3717…91411</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-orange-500/[0.06] border border-orange-500/10">
                  <div className="text-xs text-cyan-400 font-medium">Agent Wallet</div>
                  <div className="text-[10px] text-gray-500 font-mono break-all">0x5433…a1e6</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-gray-500">
                <span>Flashblocks RPC: <code className="text-orange-400/60">testrpc.xlayer.tech/flashblocks</code></span>
                <span>WSS: <code className="text-orange-400/60">xlayertestws.okx.com</code></span>
              </div>
            </div>
          </div>

          <p className="text-gray-500 text-xs mt-3">
            The AI agent uses a multi-provider LLM failover chain (Groq → Cerebras → Gemini)
            so the service remains available even under rate limits.
          </p>
        </Section>

        {/* Flashblocks */}
        <Section icon={Zap} title="Flashblocks — 200ms Confirmations" id="flashblocks">
          <p>
            X Layer Flashblocks provide <strong className="text-cyan-400">200ms preconfirmations</strong> —
            10× faster than standard 2-second block times. PulseTrader+ uses a dedicated
            Flashblocks RPC endpoint for swap confirmation polling:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400 pl-2">
            <li>Agent signs & broadcasts a transaction via the standard X Layer RPC</li>
            <li>Confirmation is polled every 50ms on the Flashblocks RPC (<code className="text-cyan-400/80">testrpc.xlayer.tech/flashblocks</code>)</li>
            <li>Confirmation arrives in ~200ms, displayed to the user in real-time</li>
          </ol>
          <p>
            The frontend also receives live block updates via WebSocket subscription to{" "}
            <code className="text-cyan-400/80">newHeads</code> on the X Layer WSS endpoint.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Stat label="Preconfirmation" value="200ms" accent="cyan" />
            <Stat label="Poll Interval" value="50ms" accent="emerald" />
            <Stat label="WSS Protocol" value="eth_subscribe" accent="purple" />
          </div>
        </Section>

        {/* Economy Loop */}
        <Section icon={RefreshCw} title="The Economy Loop" id="economy-loop">
          <p>
            PulseTrader+ creates a <strong className="text-emerald-400">self-sustaining economic cycle</strong> where
            every action generates revenue that feeds back into the system:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4 text-xs">
            {[
              { icon: "⚡", label: "User Swaps", color: "cyan" },
              { icon: "→", label: "", color: "" },
              { icon: "💰", label: "0.1% Fee", color: "amber" },
              { icon: "→", label: "", color: "" },
              { icon: "🏦", label: "Treasury", color: "emerald" },
              { icon: "→", label: "", color: "" },
              { icon: "♻️", label: "Auto-DCA", color: "purple" },
              { icon: "→", label: "", color: "" },
              { icon: "📈", label: "More Volume", color: "cyan" },
            ].map((item, i) =>
              item.label ? (
                <div key={i} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-${item.color}-500/20 bg-${item.color}-500/[0.04]`}>
                  <span className="text-lg">{item.icon}</span>
                  <span className={`text-${item.color}-400 font-medium`}>{item.label}</span>
                </div>
              ) : (
                <span key={i} className="text-gray-600 text-lg">→</span>
              )
            )}
          </div>
          <div className="space-y-2">
            <p><strong className="text-white">Revenue Stream 1 — Swap Fees:</strong> Every swap deducts 0.1% (10 bps) as a fee, collected in the output token.</p>
            <p><strong className="text-white">Revenue Stream 2 — x402 Analytics:</strong> Premium endpoints charge 0.25–2.50 PUSDC per access. Each payment creates a real onchain PUSDC transfer.</p>
            <p><strong className="text-white">Fee Treasury Sweep:</strong> Every 3 minutes, 50% of accumulated fees are swept to the treasury address (burn address) — creating onchain proof.</p>
            <p><strong className="text-white">Auto-DCA Reinvest:</strong> When x402 revenue exceeds the threshold, 40% is automatically reinvested into PWETH — closing the loop.</p>
          </div>
        </Section>

        {/* Smart Contracts */}
        <Section icon={Shield} title="Smart Contracts" id="contracts">
          <p>
            Two ERC-20 tokens deployed on X Layer Testnet via Hardhat + OpenZeppelin.
            Both have public <code className="text-cyan-400/80">mint()</code> and{" "}
            <code className="text-cyan-400/80">faucet()</code> functions for unlimited testnet liquidity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-2">
              <div className="text-emerald-400 font-semibold">PulseUSDC (PUSDC)</div>
              <div className="text-xs text-gray-500 font-mono break-all">0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E</div>
              <div className="text-xs text-gray-400">6 decimals • Stablecoin mock • Solidity 0.8.20</div>
              <a href="https://www.oklink.com/xlayer-test/address/0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400">
                View on OKLink <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 space-y-2">
              <div className="text-purple-400 font-semibold">PulseWETH (PWETH)</div>
              <div className="text-xs text-gray-500 font-mono break-all">0x3717C06A65CEd56A99e8ffef1c65a9193e991411</div>
              <div className="text-xs text-gray-400">18 decimals • Wrapped ETH mock • Solidity 0.8.20</div>
              <a href="https://www.oklink.com/xlayer-test/address/0x3717C06A65CEd56A99e8ffef1c65a9193e991411" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400">
                View on OKLink <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <p className="mt-2">
            <strong className="text-white">Swap Mechanism (Burn & Mint):</strong> Input tokens are burned (transferred to <code className="text-cyan-400/80">0x…dEaD</code>),
            output tokens are minted to the agent wallet, minus the 0.1% fee. Both steps confirmed via Flashblocks and tagged with Builder Code.
          </p>
        </Section>

        {/* OnchainOS */}
        <Section icon={Globe} title="OnchainOS Integration" id="onchainos">
          <p>
            PulseTrader+ bridges to <strong className="text-white">OnchainOS</strong> by spawning the{" "}
            <code className="text-cyan-400/80">onchainos mcp</code> CLI as a child process and communicating
            via JSON-RPC over stdio. This gives access to OKX&apos;s full suite of onchain data skills:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {[
              { skill: "market_price", desc: "Real-time token prices on 20+ chains" },
              { skill: "market_prices", desc: "Batch multi-token price queries" },
              { skill: "swap_quote", desc: "DEX aggregator quotes (500+ sources)" },
              { skill: "token_search", desc: "Token discovery across all chains" },
              { skill: "defi_search", desc: "Uniswap V3 pool & DeFi search" },
              { skill: "defi_detail", desc: "Detailed pool info: APY, TVL, fees" },
              { skill: "token_liquidity", desc: "Top 5 liquidity pools for a token" },
              { skill: "portfolio_all_balances", desc: "Cross-chain wallet portfolio" },
              { skill: "gateway_gas", desc: "Real-time gas prices per chain" },
              { skill: "swap_chains", desc: "Supported chain registry" },
            ].map((s) => (
              <div key={s.skill} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-800/30">
                <Terminal className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-cyan-400 font-mono text-xs">{s.skill}</span>
                  <p className="text-gray-500 text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Health check: <code className="text-cyan-400/60">GET /api/onchainos/status</code> — verifies the bridge returns real data with latency metrics.
          </p>
        </Section>

        {/* MCP Server */}
        <Section icon={Workflow} title="MCP Server — Composable AI" id="mcp">
          <p>
            PulseTrader+ exposes itself as a <strong className="text-white">Model Context Protocol (MCP) server</strong>,
            making it composable with Claude Desktop, other AI agents, or any MCP client.
            The server uses <code className="text-cyan-400/80">@modelcontextprotocol/sdk</code> with stdio transport.
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">14 Tools</h4>
              <div className="flex flex-wrap gap-1.5">
                {["swap", "quote", "balance", "dca_create", "dca_status", "market_price", "search_token", "agent_info", "uniswap_pools", "token_liquidity", "defi_detail", "x402_analytics", "x402_pricing", "ai_signal"].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-purple-500/[0.08] border border-purple-500/20 text-purple-400 text-[10px] font-mono">
                    pulsetrader_{t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">3 Resources</h4>
              <div className="flex flex-wrap gap-1.5">
                {["pulsetrader://portfolio", "pulsetrader://economy-loop", "pulsetrader://config"].map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">3 Prompts</h4>
              <div className="flex flex-wrap gap-1.5">
                {["trade_strategy", "portfolio_review", "economy_deep_dive"].map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded-md bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* x402 */}
        <Section icon={Lock} title="x402 Payment Protocol" id="x402">
          <p>
            Premium analytics are gated by the <strong className="text-white">HTTP 402 Payment Required</strong> protocol.
            The agent charges in PUSDC — every payment creates a real onchain transfer as a receipt.
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-800/40">
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                {[
                  ["/api/analytics/market-overview", "0.50 PUSDC", "Token prices + gas from OnchainOS"],
                  ["/api/analytics/pool-stats", "1.00 PUSDC", "TVL, volume, APY, agent metrics"],
                  ["/api/analytics/trade-history", "0.25 PUSDC", "Recent trades with fee breakdown"],
                  ["/api/analytics/economy-loop", "0.50 PUSDC", "Revenue dashboard"],
                  ["/api/analytics/ai-signal", "2.00 PUSDC", "AI trading signal + confidence score"],
                  ["/api/analytics/full-analytics", "2.50 PUSDC", "All-in-one aggregated bundle"],
                ].map(([path, price, desc]) => (
                  <tr key={path} className="border-b border-gray-800/20">
                    <td className="py-2 pr-4 font-mono text-cyan-400/70">{path}</td>
                    <td className="py-2 pr-4 text-amber-400 font-mono">{price}</td>
                    <td className="py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Builder Code */}
        <Section icon={Cpu} title="Builder Code (ERC-8021)" id="builder-code">
          <p>
            Every transaction includes the Builder Code{" "}
            <code className="text-cyan-400 font-bold">PULSETRDRV1XLYR0</code>{" "}
            as a data suffix, generated via the <code className="text-cyan-400/80">ox/erc8021</code> library.
          </p>
          <div className="rounded-xl border border-gray-800/40 bg-black/30 p-4 font-mono text-xs space-y-1">
            <div><span className="text-gray-500">Code:</span> <span className="text-cyan-400">PULSETRDRV1XLYR0</span></div>
            <div><span className="text-gray-500">Suffix:</span> <span className="text-amber-400/70">0x50554c534554524452563158…</span></div>
            <div><span className="text-gray-500">Spec:</span> <span className="text-gray-400">ERC-8021 Attribution</span></div>
          </div>
          <p className="mt-2">
            Verify by inspecting any agent transaction on{" "}
            <a href="https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              OKLink Explorer
            </a>{" "}
            — the last bytes of input data contain the encoded builder code.
          </p>
        </Section>

        {/* Autonomous Behaviors */}
        <Section icon={Brain} title="Autonomous Agent Behaviors" id="autonomous">
          <p>
            PulseTrader+ doesn&apos;t just respond to commands — it <strong className="text-white">acts autonomously</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {[
              { title: "Portfolio Rebalancer", desc: "60s interval. Sells PWETH if >55%, buys if PUSDC >60%. 2-min cooldown.", color: "cyan" },
              { title: "Heartbeat Transactions", desc: "Self-transfer every 5 minutes with Builder Code — proves agent liveness.", color: "emerald" },
              { title: "Fee Treasury Sweep", desc: "Sweeps 50% of accumulated fees to treasury every 3 minutes.", color: "amber" },
              { title: "Auto-DCA Reinvest", desc: "Reinvests 40% of x402 revenue into PWETH when threshold is met.", color: "purple" },
            ].map((b) => (
              <div key={b.title} className={`rounded-xl border border-${b.color}-500/20 bg-${b.color}-500/[0.04] p-4`}>
                <div className={`text-${b.color}-400 font-semibold text-sm`}>{b.title}</div>
                <p className="text-gray-400 text-xs mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Agent Wallet */}
        <Section icon={Coins} title="Agent Wallet & Deployment" id="wallet">
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-800/40 bg-black/30 p-4 font-mono text-xs space-y-2">
              <div>
                <span className="text-gray-500">Agent Wallet:</span>{" "}
                <a href="https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6
                </a>
              </div>
              <div><span className="text-gray-500">Chain:</span> <span className="text-white">X Layer Testnet (ID: 1952)</span></div>
              <div><span className="text-gray-500">Builder Code:</span> <span className="text-cyan-400">PULSETRDRV1XLYR0</span></div>
              <div><span className="text-gray-500">PUSDC:</span> <span className="text-emerald-400">0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E</span></div>
              <div><span className="text-gray-500">PWETH:</span> <span className="text-purple-400">0x3717C06A65CEd56A99e8ffef1c65a9193e991411</span></div>
            </div>
            <p className="text-gray-500 text-xs">
              All addresses are on X Layer Testnet. The agent wallet is a throwaway key for hackathon demo purposes.
              129+ onchain transactions with Builder Code attribution are verifiable on the explorer.
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-12 text-center space-y-2">
          <p className="text-gray-600 text-xs">
            Built for the{" "}
            <span className="text-cyan-400/60">
              OKX X Layer Hackathon
            </span>{" "}
            — X Layer Arena Track
          </p>
          <p className="text-gray-700 text-[10px]">
            Next.js 16 • Tailwind v4 • Groq → Cerebras → Gemini (failover) • viem 2 • MCP SDK 1.29 • OnchainOS 2.2.9
          </p>
        </div>
      </div>
    </div>
  );
}
