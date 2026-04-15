<p align="center">
  <img src="./frontend/public/logo.svg" alt="PulseTrader+ Logo" width="120" />
</p>

<h1 align="center">PulseTrader+</h1>
<p align="center"><strong>Autonomous AI Trading Agent on X Layer</strong></p>
<p align="center">
  <code>Autonomous · Millisecond · Agentic</code>
</p>
<p align="center">
  <em>Talk to your wallet. Trade in 200ms. Watch the economy loop earn.</em>
</p>

<p align="center">
  <a href="https://pulse-traderplus.vercel.app/">
    <img src="https://img.shields.io/badge/🟢_LIVE_DEMO-pulse--traderplus.vercel.app-00E5A0?style=for-the-badge&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <a href="https://pulse-traderplus.vercel.app/">
    <strong>▶️ Try the Live App → pulse-traderplus.vercel.app</strong>
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/BX2x0ddn5-Q">
    <img src="https://img.shields.io/badge/🎥_DEMO_VIDEO-Watch_on_YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="Demo Video" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/BX2x0ddn5-Q">
    <strong>🎥 Watch the Demo Video → youtu.be/BX2x0ddn5-Q</strong>
  </a>
</p>

<p align="center">
  <a href="https://www.okx.com/xlayer"><img src="https://img.shields.io/badge/Chain-X%20Layer%20Testnet%20(1952)-0052FF?style=for-the-badge" /></a>
  <a href="#builder-code-erc-8021"><img src="https://img.shields.io/badge/ERC--8021-PULSETRDRV1XLYR0-00E5A0?style=for-the-badge" /></a>
  <a href="#mcp-server-14-tools--3-resources--3-prompts"><img src="https://img.shields.io/badge/MCP-14%20Tools%20·%203%20Resources%20·%203%20Prompts-A855F7?style=for-the-badge" /></a>
  <a href="#x402-payment-protocol-6-gated-endpoints"><img src="https://img.shields.io/badge/x402-6%20Gated%20Endpoints-F97316?style=for-the-badge" /></a>
  <a href="#onchainos-integration-12-skills"><img src="https://img.shields.io/badge/OnchainOS-12%20Skills-38BDF8?style=for-the-badge" /></a>
</p>

---

## 📋 Table of Contents

- [What is PulseTrader+?](#what-is-pulsetrader)
- [Key Numbers](#key-numbers)
- [Architecture](#architecture)
- [Hackathon Track: X Layer Arena](#hackathon-track-x-layer-arena)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Features Deep Dive](#features-deep-dive)
  - [AI Trading Agent (18 Tools)](#-ai-trading-agent-18-tools)
  - [Multi-Provider LLM Failover](#-multi-provider-llm-failover)
  - [Flashblocks (200ms Confirmations)](#-flashblocks-200ms-confirmations)
  - [Builder Code (ERC-8021)](#-builder-code-erc-8021)
  - [OnchainOS Integration (12 Skills)](#-onchainos-integration-12-skills)
  - [x402 Payment Protocol (6 Gated Endpoints)](#-x402-payment-protocol-6-gated-endpoints)
  - [MCP Server (14 Tools + 3 Resources + 3 Prompts)](#-mcp-server-14-tools--3-resources--3-prompts)
  - [Autonomous Behaviors](#-autonomous-behaviors)
  - [Economy Loop](#-economy-loop)
- [API Reference](#api-reference)
- [Smart Contracts](#smart-contracts)
- [Agent Wallet & Builder Code](#agent-wallet--builder-code)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Team](#team)
- [License](#license)

---

## What is PulseTrader+?

PulseTrader+ is a **fully autonomous AI trading agent** that lives on X Layer Testnet. Users chat with it in natural language, and it:

1. 🧠 **Parses intent** → Understands "swap 100 PUSDC to PWETH" using LLM function calling (18 tools)
2. ⛓️ **Executes onchain** → Signs & broadcasts real transactions from its agentic wallet
3. ⚡ **Confirms in 200ms** → Uses Flashblocks preconfirmations for sub-second feedback
4. 💰 **Earns revenue** → Takes a 0.1% micro-fee on every swap → sweeps to treasury → reinvests via DCA
5. 🔐 **Sells premium data** → 6 x402 micropayment-gated analytics endpoints (paid in PUSDC)
6. 🔌 **Composes via MCP** → Exposes 14 tools + 3 resources + 3 prompts as a Model Context Protocol server
7. 🤖 **Acts autonomously** → Rebalancer, fee sweep, and DCA reinvest run WITHOUT human prompting
8. 🌐 **Queries 12 OnchainOS skills** → Real-time prices, DEX quotes, Uniswap pools, portfolio data

---

## Key Numbers

| Metric | Count |
|---|---|
| **Agent Tool Definitions** | 18 (LLM function-calling) |
| **OnchainOS Skills Integrated** | 12 (via MCP bridge) |
| **MCP Server Tools** | 14 |
| **MCP Resources** | 3 (`portfolio`, `economy-loop`, `config`) |
| **MCP Prompts** | 3 (`trade_strategy`, `portfolio_review`, `economy_deep_dive`) |
| **x402 Gated Endpoints** | 6 (with real onchain payment receipts) |
| **REST API Endpoints** | 24 |
| **Autonomous Loops** | 4 (rebalancer, fee sweep, DCA reinvest, Flashblocks listener) |
| **Onchain Transactions** | 129+ (Builder Code–tagged on X Layer Testnet) |
| **Unit Tests** | 17/17 passing |
| **Lines of Code** | ~9,000 (hand-written TypeScript + Solidity) |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     Frontend  (Next.js 16 · Turbopack)            │
│                                                                   │
│   ┌─────────────┐  ┌────────────┐  ┌───────────┐  ┌───────────┐ │
│   │  ChatPanel   │  │  Sidebar   │  │  Docs     │  │ PulseRing │ │
│   │ Rich Swap    │  │ Economy    │  │  /docs    │  │   Logo    │ │
│   │ Cards, Think │  │ Loop, Live │  │  route    │  │           │ │
│   │ Timeline     │  │ TX Feed    │  │           │  │           │ │
│   └──────────────┘  └────────────┘  └───────────┘  └───────────┘ │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP + WebSocket
┌───────────────────────────▼───────────────────────────────────────┐
│                  Backend  (Express + ws · Port 3001)               │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  AI Agent  │  │  Onchain   │  │   x402   │  │  Analytics   │  │
│  │  18 tools  │  │  Engine    │  │  6 gates  │  │  5 reports   │  │
│  │  Groq      │  │  burn+mint │  │  onchain  │  │  + AI signal │  │
│  │  Scout →   │  │  swap      │  │  receipts │  │              │  │
│  │  Cerebras →│  │            │  │           │  │              │  │
│  │  Groq 70B →│  │            │  │           │  │              │  │
│  │  Gemini    │  │            │  │           │  │              │  │
│  └─────┬──────┘  └─────┬──────┘  └────┬─────┘  └──────────────┘  │
│        │               │              │                            │
│  ┌─────▼───────────────▼──────────────▼────────────────────────┐  │
│  │              OnchainOS MCP Bridge (12 skills)                │  │
│  │  market_price · market_prices · swap_quote · swap_chains     │  │
│  │  swap_liquidity · token_search · portfolio_all_balances      │  │
│  │  portfolio_total_value · gateway_gas · defi_search           │  │
│  │  token_liquidity · defi_detail                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Autonomous Loops (no human prompting)            │  │
│  │  🔄 Rebalancer (60s)  │  💸 Fee Sweep  │  📈 DCA Reinvest   │  │
│  │  ⚡ Flashblocks WS    │  🏷️ Builder Code on every TX         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           MCP Server (stdio · 14T / 3R / 3P)                 │  │
│  │  Composable by Claude Desktop, other AI agents, any MCP host │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────────┘
                            │ viem 2.x + Flashblocks RPC
┌───────────────────────────▼────────────────────────────────────────┐
│                   X Layer Testnet  (Chain ID 1952)                  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │  PUSDC   │  │  PWETH   │  │  Agent Wallet                    │  │
│  │  6 dec   │  │  18 dec  │  │  0x5433B389d9C64f84aa01Dfc448…   │  │
│  │  0x9eb…  │  │  0x3717… │  │  129+ txs · Builder Code tagged  │  │
│  └──────────┘  └──────────┘  └──────────────────────────────────┘  │
│                                                                     │
│  Flashblocks RPC: https://testrpc.xlayer.tech/flashblocks           │
│  WSS: wss://xlayertestws.okx.com                                   │
│  Explorer: https://www.oklink.com/xlayer-test                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hackathon Track: X Layer Arena

| Requirement | Implementation | Evidence |
|---|---|---|
| **Deploy on X Layer** | PUSDC + PWETH contracts deployed to X Layer Testnet | [PUSDC](https://www.oklink.com/xlayer-test/address/0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E) · [PWETH](https://www.oklink.com/xlayer-test/address/0x3717C06A65CEd56A99e8ffef1c65a9193e991411) |
| **Flashblocks** | 200ms preconfirmation polling on every swap via `/flashblocks` RPC | `flashblocks.ts` — WebSocket to `wss://xlayertestws.okx.com` |
| **Builder Code (ERC-8021)** | `PULSETRDRV1XLYR0` appended to every tx via `ox/erc8021` `dataSuffix` | `chain.ts` line 60+ — check any tx's input data |
| **OnchainOS Skills** | 12 skills via MCP bridge to `onchainos mcp` child process | `onchainos-mcp.ts` — JSON-RPC over stdio |
| **x402 Payment Protocol** | 6 premium endpoints gated by PUSDC micropayments + onchain receipts | `x402.ts` — real token transfers on every payment |
| **MCP Server** | 14 tools + 3 resources + 3 prompts via `@modelcontextprotocol/sdk` | `mcp-server.ts` — stdio transport, `.mcp.json` config |
| **Onchain Activity** | 129+ swap transactions with Builder Code attribution | [Agent Wallet on OKLink](https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6) |
| **Autonomous Agent** | 4 background loops: rebalancer, fee sweep, DCA reinvest, Flashblocks | `rebalancer.ts`, `analytics.ts`, `flashblocks.ts` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Chain** | X Layer Testnet (Chain ID 1952, OP Stack L2) |
| **Smart Contracts** | Solidity 0.8.20, Hardhat 2, OpenZeppelin |
| **Backend** | TypeScript, Express, ws, viem 2.47 |
| **AI / LLM** | 4-provider failover: Groq-Scout → Cerebras → Groq-70B → Gemini (all free, all via OpenAI SDK) |
| **Models** | Llama 4 Scout 17B (Groq), Qwen 3 235B (Cerebras), Llama 3.3 70B (Groq), Gemini 2.0 Flash (Google) |
| **Onchain Skills** | OnchainOS CLI v2.2.9 — MCP bridge (JSON-RPC over stdio, 12 skills) |
| **MCP** | @modelcontextprotocol/sdk 1.29.0 — stdio transport |
| **Frontend** | Next.js 16.2, React 19, Tailwind v4, Framer Motion |
| **Protocols** | ERC-8021 (Builder Code via `ox/erc8021`), x402 (HTTP 402 Payment Required) |
| **Confirmations** | Flashblocks RPC (200ms preconfirmations) + WSS (newHeads) |
| **Testing** | Vitest — 17 unit tests |
| **Deployment** | Vercel (frontend) · Railway (backend) · Docker Compose (self-hosted) |

---

## Quick Start

### Prerequisites

- **Node.js 20+** 
- [**onchainos CLI**](https://web3.okx.com/tr/onchainos/dev-docs/home/what-is-onchainos) installed at `~/.local/bin/onchainos`
- A [**Groq API key**](https://console.groq.com) (free tier — or set Cerebras/Gemini as fallback)
- **OKB testnet tokens** from the [X Layer Faucet](https://www.okx.com/xlayer/faucet)

### 1. Clone & Install

```bash
git clone https://github.com/midasbal/PulseTrader.git
cd PulseTrader
npm install
```

### 2. Configure Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your keys:

```env
GROQ_API_KEY=gsk_...              # Primary LLM (free 100K tokens/day)
CEREBRAS_API_KEY=csk-...          # Fallback LLM (optional)
GEMINI_API_KEY=AIza...            # Second fallback (free, https://aistudio.google.com/apikey)
AGENT_PRIVATE_KEY=0x...           # Throwaway testnet wallet key
```

### 3. Deploy Contracts *(optional — addresses are pre-configured)*

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network xlayer-testnet
```

### 4. Run

```bash
npm run dev     # Starts backend (3001) + frontend (3000) concurrently
```

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Docs** | http://localhost:3000/docs |
| **Backend API** | http://localhost:3001 |
| **WebSocket** | ws://localhost:3001/ws |
| **Health Check** | http://localhost:3001/api/health |

### 5. Boost Onchain Activity *(optional)*

```bash
npx tsx scripts/boost-activity.ts
```

Generates 60+ real swap transactions on X Layer Testnet, all tagged with Builder Code `PULSETRDRV1XLYR0`.

### 6. Use as MCP Server (Claude Desktop)

The `.mcp.json` file is pre-configured:

```json
{
  "mcpServers": {
    "pulsetrader-plus": {
      "command": "npx",
      "args": ["tsx", "backend/src/mcp-server.ts"],
      "cwd": "/path/to/PulseTrader"
    }
  }
}
```

### 7. Docker

```bash
docker compose up --build
```

---

## Project Structure

```
PulseTrader/
├── README.md                    # This file
├── .env.example                 # Environment template (all vars documented)
├── .mcp.json                    # MCP server config for Claude Desktop
├── .gitignore                   # Proper exclusions (.env, node_modules, .next, artifacts)
├── docker-compose.yml           # Production deployment (backend + frontend)
├── package.json                 # Monorepo root (concurrently dev script)
│
├── backend/                     # Express + WS server
│   ├── .env                     # Secrets (git-ignored)
│   ├── .env.example             # Full env template
│   ├── Dockerfile               # Standalone backend container
│   ├── package.json             # Dependencies: viem, openai, express, ws, zod, mcp sdk
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── server.ts            # HTTP + WS server (24 endpoints)
│       ├── agent.ts             # AI agent core — multi-provider LLM + 18 tool definitions
│       ├── chain.ts             # X Layer chain config, viem clients, ERC-8021 dataSuffix
│       ├── onchain.ts           # Swap execution engine (burn + mint), live prices
│       ├── onchainos-mcp.ts     # OnchainOS MCP bridge (12 skills via JSON-RPC stdio)
│       ├── flashblocks.ts       # Flashblocks WebSocket listener (200ms newHeads)
│       ├── analytics.ts         # Trade history, fee revenue, economy loop, AI signal
│       ├── rebalancer.ts        # Autonomous portfolio rebalancer (55%/60% thresholds)
│       ├── x402.ts              # x402 payment gate (6 tiers, onchain receipts)
│       ├── mcp-server.ts        # MCP server (14 tools, 3 resources, 3 prompts)
│       ├── abi/
│       │   └── erc20.ts         # ERC-20 ABI (mint, burn, transfer, approve, balanceOf)
│       └── __tests__/
│           └── onchain.test.ts  # 17 unit tests (vitest)
│
├── contracts/                   # Hardhat project
│   ├── hardhat.config.ts        # X Layer Testnet network config
│   ├── contracts/
│   │   ├── MockUSDC.sol         # PulseUSDC (PUSDC) — 6 decimals, mint() + faucet()
│   │   └── MockWETH.sol         # PulseWETH (PWETH) — 18 decimals, mint() + faucet()
│   └── scripts/
│       ├── deploy.ts            # Deployment script
│       └── mint-to-agent.ts     # Mint tokens to agent wallet
│
├── frontend/                    # Next.js 16 (App Router, Turbopack)
│   ├── Dockerfile               # Standalone frontend container
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── globals.css      # Electric Cyan design system + glass morphism
│       │   ├── layout.tsx       # Dark theme, OG meta, Geist fonts
│       │   ├── page.tsx         # Main app shell (sidebar + chat)
│       │   └── docs/
│       │       └── page.tsx     # Full architecture documentation page
│       ├── components/
│       │   ├── ChatPanel.tsx    # Chat UI: rich swap cards, thinking timeline, tool traces
│       │   ├── Sidebar.tsx      # 3-zone sidebar: identity, economy loop, live TX feed
│       │   └── PulseRingLogo.tsx # Animated SVG logo
│       └── lib/
│           └── api.ts           # Typed API client + WebSocket (auto-reconnect)
│
├── scripts/
│   ├── boost-activity.ts        # Generate 60+ Builder Code–tagged swap transactions
│   └── normalize-balances.ts    # Normalize portfolio balances to target allocation
│
└── mcp-server/                  # MCP server standalone (symlink)
```

---

## Features Deep Dive

### 🧠 AI Trading Agent (18 Tools)

The agent uses **multi-provider LLM failover** with **18 tool definitions** (OpenAI-compatible function calling):

| Tool | Description | Data Source |
|---|---|---|
| `get_balances` | Wallet token balances | Onchain (viem) |
| `get_swap_quote` | Price quote for a swap | Internal pricing |
| `execute_swap` | Execute a token swap | Onchain (burn+mint) |
| `create_dca` | Create DCA schedule | Internal scheduler |
| `manage_dca` | Pause/resume/cancel DCA | Internal scheduler |
| `get_agent_info` | Agent wallet + capabilities | Local state |
| `get_market_price` | Real-time token price | **OnchainOS** `market_price` |
| `get_batch_prices` | Batch token prices | **OnchainOS** `market_prices` |
| `get_dex_quote` | DEX aggregator quote (500+ sources) | **OnchainOS** `swap_quote` |
| `search_token` | Search tokens across 20+ chains | **OnchainOS** `token_search` |
| `get_portfolio` | Portfolio balances on any chain | **OnchainOS** `portfolio_all_balances` |
| `get_gas_price` | Gas prices for X Layer | **OnchainOS** `gateway_gas` |
| `get_premium_analytics` | x402-gated market/pool analytics + AI signal | **x402** + **OnchainOS** |
| `get_x402_pricing` | x402 pricing tiers | Local state |
| `get_uniswap_pools` | Uniswap V3 pool search | **OnchainOS** `defi_search` |
| `get_token_liquidity` | Top liquidity pools for a token | **OnchainOS** `token_liquidity` |
| `get_defi_detail` | Pool details (APY, TVL, fee rate) | **OnchainOS** `defi_detail` |
| `get_rebalancer_status` | Autonomous rebalancer status | Local state |

Example conversations:
- *"Swap 100 PUSDC to PWETH"* → Executes burn+mint swap, confirms in 200ms
- *"Set up a DCA: buy 10 PUSDC worth of PWETH every 60s, 5 times"* → Creates automated schedule
- *"Show me Uniswap pools for ETH on Ethereum"* → Queries OnchainOS `defi_search`
- *"What's the AI trading signal?"* → Calls x402-gated AI analytics endpoint

### 🔀 Multi-Provider LLM Failover

The agent automatically fails over between **4 LLM providers** when rate limits are hit:

```
Groq-Scout (primary — Llama 4 Scout 17B, 326ms avg response)
  ↓ 429/rate-limit
Cerebras (fallback 1 — Qwen 3 235B, free, ultra-fast inference)
  ↓ 429/rate-limit
Groq-70B (fallback 2 — Llama 3.3 70B Versatile, highest quality)
  ↓ 429/rate-limit
Gemini (final fallback — Gemini 2.0 Flash, free 15 RPM)
```

All four providers are **100% free** — no credit card needed. Successful providers are auto-promoted to primary position for subsequent calls. All providers use the OpenAI-compatible SDK for consistent tool calling behavior.

### ⚡ Flashblocks (200ms Confirmations)

Every swap is confirmed via Flashblocks RPC polling — transactions appear in ~200ms instead of the standard 2s block time.

- **RPC**: `https://testrpc.xlayer.tech/flashblocks`
- **WSS**: `wss://xlayertestws.okx.com` (newHeads subscription)
- Confirmation time is displayed in the chat UI swap cards

### 🏷️ Builder Code (ERC-8021)

Every transaction includes `PULSETRDRV1XLYR0` as a data suffix via `ox/erc8021`:

```typescript
// chain.ts
import { dataSuffix } from "ox/erc8021";
const builderCode = dataSuffix({ builderCode: "PULSETRDRV1XLYR0" });
// Appended to every transaction automatically via viem's dataSuffix option
```

Verify: Check any agent transaction's input data on [OKLink Explorer](https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6) — the last bytes contain the encoded builder code.

### 🔌 OnchainOS Integration (12 Skills)

PulseTrader+ bridges to OnchainOS via a child process MCP client (JSON-RPC over stdio):

```
Agent Tool → onchainos-mcp.ts → spawn("onchainos mcp") → JSON-RPC stdio → OnchainOS API
```

| # | OnchainOS Skill | Agent Tool | Category |
|---|---|---|---|
| 1 | `market_price` | `get_market_price` | DEX Market |
| 2 | `market_prices` | `get_batch_prices` | DEX Market |
| 3 | `swap_quote` | `get_dex_quote` | DEX Swap |
| 4 | `swap_chains` | *(internal)* | DEX Swap |
| 5 | `swap_liquidity` | *(internal)* | DEX Swap |
| 6 | `token_search` | `search_token` | DEX Token |
| 7 | `portfolio_all_balances` | `get_portfolio` | Wallet |
| 8 | `portfolio_total_value` | *(internal)* | Wallet |
| 9 | `gateway_gas` | `get_gas_price` | Gateway |
| 10 | `defi_search` | `get_uniswap_pools` | DeFi / Uniswap |
| 11 | `token_liquidity` | `get_token_liquidity` | DeFi / Uniswap |
| 12 | `defi_detail` | `get_defi_detail` | DeFi / Uniswap |

**Health check**: `GET /api/onchainos/status` — makes a live `market_price` call to verify the bridge is operational.

### 💰 x402 Payment Protocol (6 Gated Endpoints)

Premium analytics are gated by the x402 micropayment standard (HTTP 402 Payment Required):

| Endpoint | Price | Description |
|---|---|---|
| `/api/analytics/market-overview` | 0.50 PUSDC | Token prices + gas data from OnchainOS |
| `/api/analytics/pool-stats` | 1.00 PUSDC | Uniswap pool TVL, volume, APY |
| `/api/analytics/trade-history` | 0.25 PUSDC | Recent agent trades with P&L |
| `/api/analytics/economy-loop` | 0.50 PUSDC | Revenue dashboard: fees, sweeps, reinvestments |
| `/api/analytics/ai-signal` | 2.00 PUSDC | AI-generated trading signal (LLM reasoning) |
| `/api/analytics/full-analytics` | 2.50 PUSDC | All 5 analytics in one response |

**Payment modes:**
- **`demo`**: Creates a real onchain PUSDC self-transfer as a payment receipt → generates a verifiable X Layer transaction
- **`onchain`**: Verifies a user-provided `txHash` for PUSDC transfer to the agent wallet

Every payment generates a session token valid for 1 hour.

### 🔧 MCP Server (14 Tools + 3 Resources + 3 Prompts)

PulseTrader+ exposes itself as a fully-compliant MCP server for agent-to-agent composability:

**Tools (14):**

| Tool | Description |
|---|---|
| `pulsetrader_swap` | Execute token swap on X Layer |
| `pulsetrader_quote` | Get swap price quote |
| `pulsetrader_balance` | Check wallet balances |
| `pulsetrader_dca_create` | Create DCA schedule |
| `pulsetrader_dca_status` | Manage DCA schedules |
| `pulsetrader_market_price` | Real-time token price (OnchainOS) |
| `pulsetrader_search_token` | Search tokens across chains |
| `pulsetrader_agent_info` | Agent info + capabilities |
| `pulsetrader_uniswap_pools` | Search Uniswap V3 pools (OnchainOS) |
| `pulsetrader_token_liquidity` | Token liquidity pools (OnchainOS) |
| `pulsetrader_defi_detail` | Pool details: APY, TVL, fee rate (OnchainOS) |
| `pulsetrader_x402_analytics` | Premium analytics (auto-pay x402) |
| `pulsetrader_x402_pricing` | x402 pricing tiers |
| `pulsetrader_ai_signal` | AI trading signal (x402-gated, LLM reasoning) |

**Resources (3):**

| URI | Description |
|---|---|
| `pulsetrader://portfolio` | Live portfolio balances (JSON) |
| `pulsetrader://economy-loop` | Economy loop stats + treasury (JSON) |
| `pulsetrader://config` | Agent config, contracts, capabilities (JSON) |

**Prompts (3):**

| Prompt | Description |
|---|---|
| `trade_strategy` | Guided workflow: analyze portfolio → research token → suggest strategy |
| `portfolio_review` | Comprehensive review: balances, prices, allocation vs targets |
| `economy_deep_dive` | Full economy loop dashboard: fees, sweeps, reinvestments, x402 revenue |

### 🤖 Autonomous Behaviors

PulseTrader+ runs **4 autonomous loops** that operate WITHOUT any user prompting:

| Loop | Interval | Behavior |
|---|---|---|
| **Portfolio Rebalancer** | 60s check, 120s cooldown | Sells PWETH if >55% of portfolio; buys PWETH if PUSDC >60% |
| **Fee Treasury Sweep** | On trade events | When fees reach 2 PUSDC, sweeps 50% to treasury (burn address) |
| **DCA Reinvest** | On sweep events | When treasury reaches 5 PUSDC, auto-creates DCA buy of PWETH |
| **Flashblocks Listener** | Continuous (WSS) | Subscribes to `newHeads` for real-time block events |

All autonomous trades use the same swap engine → pay the 0.1% fee → tag with Builder Code → feed the economy loop.

### 🔄 Economy Loop

The agent's self-sustaining economy:

```
User chats → Swap executes → 0.1% fee collected
                                    ↓
                           Fee Treasury accumulates
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓                               ↓
            Treasury Sweep                   x402 Payment Revenue
            (burn 50% of fees)               (sell premium data)
                    ↓                               ↓
            Auto-DCA Reinvest                Agent balance grows
            (buy PWETH with surplus)
                    ↓
            Portfolio rebalances automatically
                    ↓
            Cycle repeats ∞
```

---

## API Reference

### Core Endpoints (8)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Root proof-of-life (service name, chain, uptime) |
| `GET` | `/api/health` | Health check (agent, flashblocks, onchainos, rebalancer) |
| `POST` | `/api/chat` | Chat with AI agent (18 tools, reasoning traces) |
| `GET` | `/api/agent` | Agent wallet info + capabilities |
| `GET` | `/api/balances` | Token balances (PUSDC, PWETH, OKB) |
| `GET` | `/api/quote` | Swap price quote |
| `POST` | `/api/swap` | Execute swap (burn+mint, 200ms confirm) |
| `POST` | `/api/reset` | Reset chat session |

### Market Data Endpoints (4)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prices` | Live token prices |
| `GET` | `/api/trades` | Recent trade history |
| `GET` | `/api/rebalancer/status` | Autonomous rebalancer state |
| `GET` | `/api/treasury/status` | Fee treasury status |

### OnchainOS Endpoints (3)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/onchainos/status` | OnchainOS bridge health check |
| `GET` | `/api/onchainos/uniswap-pools?query=ETH` | Search Uniswap pools |
| `GET` | `/api/onchainos/token-liquidity?address=0x...` | Token liquidity data |

### x402 Endpoints (3 + 6 gated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/x402/pricing` | Pricing info for all tiers (free) |
| `GET` | `/api/x402/status` | Active payment sessions |
| `POST` | `/api/x402/pay` | Create payment session (demo or onchain) |
| `GET` | `/api/analytics/market-overview` | 🔒 0.50 PUSDC — Token prices + gas |
| `GET` | `/api/analytics/pool-stats` | 🔒 1.00 PUSDC — Pool TVL, volume, APY |
| `GET` | `/api/analytics/trade-history` | 🔒 0.25 PUSDC — Agent trade history |
| `GET` | `/api/analytics/economy-loop` | 🔒 0.50 PUSDC — Revenue dashboard |
| `GET` | `/api/analytics/ai-signal` | 🔒 2.00 PUSDC — AI trading signal |
| `GET` | `/api/analytics/full-analytics` | 🔒 2.50 PUSDC — All analytics combined |

### WebSocket

Connect to `ws://localhost:3001/ws` for real-time events:
- ⚡ Flashblock `newHeads` (every 200ms)
- 📊 DCA execution events
- 🔄 Rebalancer trade events
- 💓 Heartbeat (every 30s)

---

## Smart Contracts

### PulseUSDC (PUSDC)

| Property | Value |
|---|---|
| **Address** | [`0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E`](https://www.oklink.com/xlayer-test/address/0x9eb8679A851A383D1E2678c29ed92FbB85c72c0E) |
| **Decimals** | 6 |
| **Standard** | ERC-20 (OpenZeppelin) |
| **Features** | Public `mint(address, uint256)`, `faucet()` (1000 PUSDC per call) |

### PulseWETH (PWETH)

| Property | Value |
|---|---|
| **Address** | [`0x3717C06A65CEd56A99e8ffef1c65a9193e991411`](https://www.oklink.com/xlayer-test/address/0x3717C06A65CEd56A99e8ffef1c65a9193e991411) |
| **Decimals** | 18 |
| **Standard** | ERC-20 (OpenZeppelin) |
| **Features** | Public `mint(address, uint256)`, `faucet()` (1 PWETH per call) |

### Swap Mechanism (Burn + Mint)

```
User: "Swap 100 PUSDC to PWETH"

1. BURN  →  Transfer 100 PUSDC to 0x000...dEaD (burn address)
             └── Flashblocks confirmation (~200ms)
             └── Builder Code: PULSETRDRV1XLYR0

2. PRICE →  Calculate output: 100 PUSDC ÷ $2,500/ETH = 0.04 PWETH
             └── 0.1% fee deducted: 0.03996 PWETH to user, 0.00004 PWETH as fee

3. MINT  →  Mint 0.03996 PWETH to agent wallet
             └── Flashblocks confirmation (~200ms)
             └── Builder Code: PULSETRDRV1XLYR0
```

---

## Agent Wallet & Builder Code

| Property | Value |
|---|---|
| **Agent Address** | [`0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6`](https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6) |
| **Builder Code** | `PULSETRDRV1XLYR0` (16-char ERC-8021) |
| **Wallet Type** | Throwaway testnet wallet (agentic key) |
| **Transaction Count** | 129+ (all Builder Code–tagged) |

---

## Docker Deployment

```bash
docker compose up --build
```

| Container | Port | Description |
|---|---|---|
| `pulsetrader-backend` | 3001 | Express API + WebSocket + MCP bridge |
| `pulsetrader-frontend` | 3000 | Next.js standalone (Turbopack build) |

Both containers use multi-stage builds for minimal image size. The frontend uses `output: "standalone"` for serverless-ready deployment.

### Live Deployment

| Service | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | [pulse-traderplus.vercel.app](https://pulse-traderplus.vercel.app/) |
| **Backend** | Railway | [pulsetrader-production-3d28.up.railway.app](https://pulsetrader-production-3d28.up.railway.app/) |
| **Explorer** | OKLink | [X Layer Testnet Explorer](https://www.oklink.com/xlayer-test/address/0x5433B389d9C64f84aa01Dfc4488594F3A72eA1e6) |

---

## Testing

```bash
cd backend && npx vitest run
```

**17/17 tests passing** — covering:

- Token registry resolution (symbol → address → decimals)
- Price calculation engine (PUSDC ↔ PWETH at live rates)
- Fee computation (0.1% = 10 bps, with rounding verification)
- Swap quote generation (input/output/fee breakdown)
- Edge cases (zero amounts, unknown tokens, max precision)

---

## Team

| Role | Builder |
|---|---|
| **Solo Builder** | [@midasbal](https://github.com/midasbal) |

---

## License

MIT

---

<p align="center">
  <strong>Built for the OKX X Layer Hackathon — X Layer Arena Track</strong>
</p>
<p align="center">
  <em>~9,000 lines of TypeScript + Solidity · 18 agent tools · 12 OnchainOS skills · 14 MCP tools · 6 x402 endpoints · 4 LLM providers · 129+ onchain transactions</em>
</p>
