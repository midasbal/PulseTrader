"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X, BookOpen, Zap, Activity } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import Sidebar from "@/components/Sidebar";
import { getHealth, type HealthInfo } from "@/lib/api";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  // Poll agent health every 8 seconds for header indicators
  const fetchHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const iv = setInterval(fetchHealth, 8000);
    return () => clearInterval(iv);
  }, [fetchHealth]);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar on desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-[#0A0E1A] text-gray-100 overflow-hidden">
      {/* ── Mobile Sidebar Overlay ─────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[280px] glass border-r border-gray-800/30
          transform transition-transform duration-300 ease-out
          md:relative md:translate-x-0 md:flex md:flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-4 right-3 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar />
      </aside>

      {/* ── Main Chat Area ────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-800/30 md:hidden shrink-0 isolate z-20 bg-[#0A0E1A]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white tracking-tight">
            <span className="text-cyan-400">Pulse</span>Trader<span className="text-emerald-400">+</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/docs"
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 overflow-hidden transition-all duration-300 hover:scale-105"
            >
              {/* Gradient border glow */}
              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-cyan-500/30 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="absolute inset-[1px] rounded-[7px] bg-[#0A0E1A]" />
              <span className="relative flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Docs</span>
              </span>
              {/* Animated glow pulse */}
              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 animate-pulse" />
            </a>
          </div>
        </div>

        {/* Desktop top bar — Live Status + Tagline + Docs */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-gray-800/20 shrink-0 isolate z-20 bg-[#0A0E1A]">
          {/* Left: Live network & agent status indicators */}
          <div className="flex items-center gap-3">
            {/* Network badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inset-0 rounded-full ${health?.status === "ok" ? "bg-emerald-400 animate-ping" : "bg-gray-500"} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${health?.status === "ok" ? "bg-emerald-400" : "bg-gray-500"}`} />
              </span>
              <span className="text-[11px] font-medium text-gray-400">X Layer Testnet</span>
            </div>

            {/* Flashblocks indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/[0.06] border border-orange-500/15">
              <Zap className={`w-3 h-3 ${health?.flashblocksConnected ? "text-orange-400" : "text-gray-600"}`} />
              <span className="text-[11px] font-medium text-gray-500">
                {health?.flashblocksConnected ? (
                  <span className="text-orange-300">200ms Blocks</span>
                ) : (
                  "Flashblocks"
                )}
              </span>
            </div>

            {/* Agent status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/[0.06] border border-purple-500/15">
              <Activity className={`w-3 h-3 ${health?.status === "ok" ? "text-purple-400" : "text-gray-600"}`} />
              <span className={`text-[11px] font-medium ${health?.status === "ok" ? "text-purple-300" : "text-gray-500"}`}>
                Agent {health?.status === "ok" ? "Live" : "·  ·  ·"}
              </span>
            </div>
          </div>

          {/* Center: Tagline */}
          <div className="flex-1 flex justify-center">
            <span className="text-[11px] font-medium tracking-[0.25em] uppercase text-gray-600 select-none">
              Autonomous · Millisecond · Agentic
            </span>
          </div>

          {/* Right: Docs button */}
          <a
            href="/docs"
            className="group relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(0,229,160,0.3)]"
          >
            {/* Gradient border */}
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/40 via-emerald-500/40 to-cyan-500/40 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="absolute inset-[1px] rounded-[7px] bg-[#0A0E1A] group-hover:bg-[#0C1220] transition-colors" />
            <span className="relative flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 group-hover:text-cyan-300 transition-colors" />
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Docs
              </span>
            </span>
            {/* Scanning light effect */}
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </a>
        </div>

        <div className="flex-1 min-h-0 relative z-0">
          <ChatPanel />
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        <footer className="shrink-0 flex items-center justify-center gap-4 px-4 py-2 border-t border-gray-800/20 bg-[#0A0E1A]">
          <span className="text-[10px] text-gray-600 select-none">
            Built for OKX X Layer Hackathon
          </span>
          <a
            href="https://github.com/midasbal/PulseTrader"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors"
            title="View on GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 group-hover:scale-110 transition-transform"
            >
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-[10px] font-medium hidden sm:inline">GitHub</span>
          </a>
        </footer>
      </main>
    </div>
  );
}
