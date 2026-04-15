// Ensure API_BASE always has a protocol prefix
const RAW_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_BASE = /^https?:\/\//.test(RAW_API) ? RAW_API : `https://${RAW_API}`;

// Auto-derive WebSocket URL from API_BASE (handles http→ws and https→wss)
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace(/^http/, "ws") + "/ws";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolTrace {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  toolCalls?: ToolTrace[];
}

export interface AgentInfo {
  address: string;
  balances: { token: string; balance: string }[];
  chainId: number;
  explorerUrl: string;
  builderCode?: string;
  network?: string;
}

export interface SwapQuote {
  amountOut: string;
  fee: string;
  rate: string;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
}

export interface HealthInfo {
  status: string;
  agent: string | null;
  chain: string;
  flashblocksConnected: boolean;
  builderCode: string;
  timestamp: string;
}

export interface BalancesResponse {
  address: string;
  balances: { token: string; balance: string }[];
}

// x402 types
export interface X402PricingInfo {
  endpoints: Array<{
    resource: string;
    path: string;
    price: string;
    description: string;
  }>;
  paymentToken: { symbol: string; address: string; decimals: number };
  recipient: string;
}

export interface X402PaymentResult {
  status: string;
  sessionId: string;
  resource: string;
  amount: string;
  token: string;
  expiresIn: string;
  expiresAt: string;
  instructions: string;
}

export interface AnalyticsData {
  premium: boolean;
  data: unknown;
}

// WebSocket event types
export interface WSBlockUpdate {
  type: "newBlock";
  number?: string;
  blockNumber?: string;
  hash?: string;
  blockHash?: string;
  timestamp: string | number;
  gasUsed?: string;
  txCount?: number;
  transactionCount?: number;
}

export interface WSDCAUpdate {
  type: "dcaExecution";
  dcaId: string;
  amountIn: string;
  amountOut: string;
  fromToken: string;
  toToken: string;
  txHash: string;
}

export interface WSConnected {
  type: "connected";
  agent: string;
  chain: string;
}

export interface WSRebalanceEvent {
  type: "rebalance";
  action: "sell_pweth" | "buy_pweth" | "check_only";
  reason: string;
  allocation: { okb: number; pusdc: number; pweth: number };
  trade?: {
    txHash: string;
    fromToken: string;
    toToken: string;
    amountIn: string;
    amountOut: string;
  };
}

export interface WSHeartbeat {
  type: "heartbeat";
  txHash: string;
  count: number;
  timestamp: number;
}

export type WSEvent = WSBlockUpdate | WSDCAUpdate | WSConnected | WSRebalanceEvent | WSHeartbeat;

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------

export async function sendChat(
  message: string,
  sessionId: string = "default"
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
  return res.json();
}

export async function getAgentInfo(): Promise<AgentInfo> {
  const res = await fetch(`${API_BASE}/api/agent`);
  if (!res.ok) throw new Error(`Agent info failed: ${res.statusText}`);
  return res.json();
}

export async function getBalances(): Promise<BalancesResponse> {
  const res = await fetch(`${API_BASE}/api/balances`);
  if (!res.ok) throw new Error(`Balances failed: ${res.statusText}`);
  return res.json();
}

export async function getQuote(
  from: string,
  to: string,
  amount: number
): Promise<SwapQuote> {
  const res = await fetch(
    `${API_BASE}/api/quote?from=${from}&to=${to}&amount=${amount}`
  );
  if (!res.ok) throw new Error(`Quote failed: ${res.statusText}`);
  return res.json();
}

export async function getHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function getPrices(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/prices`);
  const data = await res.json();
  return data.prices;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  fee: string;
  txHash: string;
}

export async function getTradeHistory(): Promise<TradeRecord[]> {
  const res = await fetch(`${API_BASE}/api/trades`);
  const data = await res.json();
  return Array.isArray(data?.trades) ? data.trades : [];
}

export interface RebalancerStatus {
  running: boolean;
  lastCheck: number | null;
  rebalanceCount: number;
  history: Array<{
    timestamp: number;
    action: string;
    reason: string;
    allocation: { okb: number; pusdc: number; pweth: number };
    trade?: { txHash: string; fromToken: string; toToken: string; amountIn: string; amountOut: string };
  }>;
}

export async function getRebalancerStatus(): Promise<RebalancerStatus> {
  const res = await fetch(`${API_BASE}/api/rebalancer/status`);
  return res.json();
}

export interface TreasuryStatus {
  treasuryAddress: string;
  sweepCount: number;
  sweepHistory: Array<{
    timestamp: number;
    amount: string;
    token: string;
    txHash: string;
    type: "treasury_sweep" | "auto_reinvest";
  }>;
  pendingFeesPUSDC: number;
  pendingFeesPWETH: number;
}

export async function getTreasuryStatus(): Promise<TreasuryStatus> {
  const res = await fetch(`${API_BASE}/api/treasury/status`);
  return res.json();
}

export async function resetSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

// ---------------------------------------------------------------------------
// x402 Premium Analytics API
// ---------------------------------------------------------------------------

export async function getX402Pricing(): Promise<X402PricingInfo> {
  const res = await fetch(`${API_BASE}/api/x402/pricing`);
  if (!res.ok) throw new Error(`x402 pricing failed: ${res.statusText}`);
  return res.json();
}

export async function payForAnalytics(
  resource: string,
  mode: "demo" | "onchain" = "demo"
): Promise<X402PaymentResult> {
  const res = await fetch(`${API_BASE}/api/x402/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, mode }),
  });
  if (!res.ok) throw new Error(`x402 payment failed: ${res.statusText}`);
  return res.json();
}

export async function getAnalytics(
  resource: string,
  sessionId: string
): Promise<AnalyticsData> {
  const res = await fetch(
    `${API_BASE}/api/analytics/${resource}`,
    {
      headers: { "X-Payment-Session": sessionId },
    }
  );
  if (res.status === 402) {
    throw new Error("Payment required — need valid x402 session");
  }
  if (!res.ok) throw new Error(`Analytics failed: ${res.statusText}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

export function createWebSocket(
  onMessage: (event: WSEvent) => void,
  onStatusChange?: (connected: boolean) => void
): { close: () => void } {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    ws = new WebSocket(WS_URL);

    ws.onopen = () => onStatusChange?.(true);

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as WSEvent;
        onMessage(data);
      } catch {
        // ignore non-JSON
      }
    };

    ws.onclose = () => {
      onStatusChange?.(false);
      if (!closed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => ws?.close();
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
