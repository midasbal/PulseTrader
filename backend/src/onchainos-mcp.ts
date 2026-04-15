/**
 * OnchainOS MCP Client Bridge — PulseTrader+
 *
 * Spawns the `onchainos mcp` process and communicates via JSON-RPC over stdio.
 * Provides typed wrappers around the MCP tools we use:
 *   - market_price      (real-time token price)
 *   - market_prices     (batch prices)
 *   - swap_quote        (DEX aggregator quote)
 *   - swap_chains       (supported chains)
 *   - token_search      (token discovery)
 *   - portfolio_all_balances  (wallet holdings)
 *   - portfolio_total_value   (portfolio value)
 *   - gateway_gas       (gas prices)
 */
import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { existsSync, mkdirSync, chmodSync, createWriteStream } from "fs";
import { join } from "path";
import https from "https";

// ---------------------------------------------------------------------------
// Ensure onchainos binary exists (auto-download for cloud environments)
// ---------------------------------------------------------------------------

const ONCHAINOS_REPO = "okx/onchainos-skills";

function getOnchainosBinPath(): string {
  if (process.env.ONCHAINOS_BIN) return process.env.ONCHAINOS_BIN;
  return join(process.env.HOME || "/root", ".local", "bin", "onchainos");
}

/** Follow redirects (GitHub releases → S3) using native https */
function httpsGet(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "PulseTrader" } }, (res) => {
      // Follow up to 5 redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(60_000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

/** Fetch the latest stable release tag from GitHub API (pure Node.js) */
async function getLatestTag(): Promise<string> {
  const buf = await httpsGet(`https://api.github.com/repos/${ONCHAINOS_REPO}/releases/latest`);
  const json = JSON.parse(buf.toString());
  const tag: string = json.tag_name; // e.g. "v2.2.9"
  if (!tag) throw new Error("Could not determine latest onchainos version");
  return tag;
}

/**
 * Download the onchainos binary using pure Node.js https — no curl, no sh.
 * Works on minimal containers (Railway Nixpacks, etc.).
 */
async function ensureBinary(): Promise<string> {
  const binPath = getOnchainosBinPath();

  if (existsSync(binPath)) {
    return binPath;
  }

  console.log("⬇️  onchainos binary not found — downloading via Node.js https...");
  try {
    // 1. Determine platform target
    const arch = process.arch === "x64" ? "x86_64" : process.arch === "arm64" ? "aarch64" : process.arch;
    const target = `${arch}-unknown-linux-gnu`;

    // 2. Get latest version tag from GitHub API
    const tag = await getLatestTag();
    console.log(`   Version: ${tag}  Target: ${target}`);

    // 3. Download the binary
    const binaryUrl = `https://github.com/${ONCHAINOS_REPO}/releases/download/${tag}/onchainos-${target}`;
    console.log(`   Fetching ${binaryUrl} ...`);
    const data = await httpsGet(binaryUrl);

    if (data.length < 1_000) {
      throw new Error(`Downloaded file too small (${data.length} bytes) — likely a 404 page`);
    }

    // 4. Write to disk
    const binDir = join(process.env.HOME || "/root", ".local", "bin");
    mkdirSync(binDir, { recursive: true });

    const { writeFileSync } = await import("fs");
    writeFileSync(binPath, data, { mode: 0o755 });
    chmodSync(binPath, 0o755);

    console.log(`✅ onchainos binary installed at ${binPath} (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
    return binPath;
  } catch (err: any) {
    console.error(`❌ Failed to install onchainos: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// ---------------------------------------------------------------------------
// MCP Client
// ---------------------------------------------------------------------------

class OnchainOSClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private buffer = "";
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Spawn the onchainos MCP server and initialize the JSON-RPC session.
   */
  async connect(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve, reject) => {
      let onchainos: string;
      try {
        onchainos = await ensureBinary();
      } catch (err: any) {
        reject(new Error(`onchainos binary unavailable: ${err.message}`));
        return;
      }

      this.process = spawn(onchainos, ["mcp"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          // Use sandbox keys if no custom keys set
        },
      });

      this.process.stdout!.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.process.stderr!.on("data", (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) console.error(`[onchainos stderr] ${msg}`);
      });

      this.process.on("error", (err) => {
        console.error("[onchainos] process error:", err.message);
        reject(err);
      });

      this.process.on("exit", (code) => {
        console.log(`[onchainos] process exited with code ${code}`);
        this.initialized = false;
        this.initPromise = null;
      });

      // Send initialize request
      const initReq: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: ++this.requestId,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "pulsetrader-plus", version: "1.0.0" },
        },
      };

      this.pending.set(initReq.id, {
        resolve: () => {
          // Send initialized notification
          this.write({
            jsonrpc: "2.0",
            method: "notifications/initialized",
          } as any);
          this.initialized = true;
          console.log("✅ OnchainOS MCP client connected");
          resolve();
        },
        reject,
      });

      this.write(initReq);
    });

    return this.initPromise;
  }

  /**
   * Call an MCP tool by name.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.initialized) await this.connect();

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP tool call "${name}" timed out after 10s`));
      }, 10_000);

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timeout);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });

      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      };

      this.write(req);
    });
  }

  /**
   * Parse a tool result into a JSON object.
   */
  parseToolResult(result: unknown): unknown {
    const r = result as MCPToolResult;
    if (!r?.content?.length) return null;

    const textContent = r.content.find((c) => c.type === "text");
    if (!textContent) return null;

    try {
      return JSON.parse(textContent.text);
    } catch {
      return textContent.text;
    }
  }

  /**
   * Disconnect and kill the onchainos process.
   */
  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.initialized = false;
      this.initPromise = null;
    }
  }

  /**
   * Check if the MCP client is connected and ready.
   */
  isReady(): boolean {
    return this.initialized;
  }

  // ---- Private ----

  private write(msg: object): void {
    if (!this.process?.stdin?.writable) {
      throw new Error("onchainos process not running");
    }
    this.process.stdin.write(JSON.stringify(msg) + "\n");
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);

          if (msg.error) {
            handler.reject(
              new Error(`MCP error: ${msg.error.message}`)
            );
          } else {
            handler.resolve(msg.result);
          }
        }
      } catch {
        // Non-JSON output (e.g., onchainos diagnostics)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton + High-Level API
// ---------------------------------------------------------------------------

export const onchainOS = new OnchainOSClient();

/**
 * Get real-time price for a token on a chain.
 */
export async function getMarketPrice(
  address: string,
  chain = "xlayer"
): Promise<{ price: string; chain: string } | null> {
  const result = await onchainOS.callTool("market_price", { address, chain });
  const parsed = onchainOS.parseToolResult(result) as any;
  if (parsed?.ok && parsed.data?.length > 0) {
    return {
      price: parsed.data[0].price,
      chain: parsed.data[0].chainIndex,
    };
  }
  return null;
}

/**
 * Get batch prices for multiple tokens.
 */
export async function getMarketPrices(
  tokens: string // "chain:address,chain:address"
): Promise<unknown> {
  const result = await onchainOS.callTool("market_prices", { tokens });
  return onchainOS.parseToolResult(result);
}

/**
 * Get a DEX aggregator swap quote.
 */
export async function getSwapQuoteFromDEX(
  from: string,
  to: string,
  amount: string,
  chain = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("swap_quote", {
    from,
    to,
    amount,
    chain,
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Search for tokens across chains.
 */
export async function searchToken(
  query: string,
  chains?: string
): Promise<unknown> {
  const args: Record<string, unknown> = { query };
  if (chains) args.chains = chains;
  const result = await onchainOS.callTool("token_search", args);
  return onchainOS.parseToolResult(result);
}

/**
 * Get wallet portfolio balances on specific chains.
 */
export async function getPortfolioBalances(
  address: string,
  chains = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("portfolio_all_balances", {
    address,
    chains,
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Get total portfolio value.
 */
export async function getPortfolioValue(
  address: string,
  chains = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("portfolio_total_value", {
    address,
    chains,
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Get gas prices for a chain.
 */
export async function getGasPrice(chain = "xlayer"): Promise<unknown> {
  const result = await onchainOS.callTool("gateway_gas", { chain });
  return onchainOS.parseToolResult(result);
}

/**
 * Get supported DEX swap chains.
 */
export async function getSwapChains(): Promise<unknown> {
  const result = await onchainOS.callTool("swap_chains", {});
  return onchainOS.parseToolResult(result);
}

/**
 * Get available liquidity sources on a chain.
 */
export async function getSwapLiquidity(chain = "xlayer"): Promise<unknown> {
  const result = await onchainOS.callTool("swap_liquidity", { chain });
  return onchainOS.parseToolResult(result);
}

/**
 * Search for Uniswap (or other DeFi) liquidity pools for a token.
 * Uses the `defi_search` tool with platform filter.
 */
export async function getUniswapPools(
  query: string,
  chain = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("defi_search", {
    query,
    chain,
    platform: "Uniswap",
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Get top liquidity pools for a token.
 * Uses the `token_liquidity` tool — returns up to 5 pools.
 */
export async function getTokenLiquidity(
  address: string,
  chain = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("token_liquidity", {
    address,
    chain,
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Get detailed information about a DeFi product (pool).
 * Returns APY, TVL, fee rate, etc.
 */
export async function getDefiDetail(
  productId: string,
  chain = "xlayer"
): Promise<unknown> {
  const result = await onchainOS.callTool("defi_detail", {
    id: productId,
    chain,
  });
  return onchainOS.parseToolResult(result);
}

/**
 * Health check — verify OnchainOS is working by making a live API call.
 * Returns { ok: true, latencyMs, sample } on success, or { ok: false, error } on failure.
 */
export async function healthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  sample?: unknown;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Use ETH on Ethereum — guaranteed to have price data (xlayer native often returns null)
    const result = await getMarketPrice(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "ethereum"
    );
    if (result !== null) {
      return { ok: true, latencyMs: Date.now() - start, sample: result };
    }
    // Fallback: try token_search which is very reliable
    const fallback = await onchainOS.callTool("token_search", { query: "ETH" });
    const parsed = onchainOS.parseToolResult(fallback);
    return {
      ok: parsed !== null,
      latencyMs: Date.now() - start,
      sample: parsed ? { source: "token_search", query: "ETH" } : null,
    };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}
