/**
 * Flashblocks WebSocket Client
 *
 * Connects to X Layer's WebSocket endpoint and subscribes to new blocks.
 * Provides real-time block/transaction updates for the Live TX Feed UI component.
 *
 * Official docs:
 *   - WSS endpoints: https://web3.okx.com/tr/xlayer/docs/developer/websockets-endpoints/websocket-endpoints
 *   - Flashblocks:   https://web3.okx.com/tr/xlayer/docs/developer/flashblocks/overview
 *
 * Testnet WSS: wss://xlayertestws.okx.com
 * Mainnet WSS: wss://xlayerws.okx.com / wss://ws.xlayer.tech
 */
import WebSocket from "ws";
import { config } from "./chain";

export interface BlockUpdate {
  type: "newBlock";
  blockNumber: string;
  blockHash: string;
  timestamp: number;
  transactionCount: number;
  transactions: string[];
}

type BlockListener = (update: BlockUpdate) => void;

class FlashblocksClient {
  private ws: WebSocket | null = null;
  private listeners: BlockListener[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptionId: string | null = null;
  private isConnecting = false;

  /**
   * Connect to the X Layer WebSocket endpoint and subscribe to newHeads.
   */
  connect(): void {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const wssUrl = config.wssUrl;
    console.log(`🔌 Connecting to X Layer WSS: ${wssUrl}`);

    this.ws = new WebSocket(wssUrl);

    this.ws.on("open", () => {
      this.isConnecting = false;
      console.log("✅ WebSocket connected to X Layer");

      // Subscribe to newHeads for real-time block updates
      this.ws?.send(
        JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_subscribe",
          params: ["newHeads"],
        })
      );
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Subscription confirmation
        if (msg.id === 1 && msg.result) {
          this.subscriptionId = msg.result;
          console.log(`📡 Subscribed to newHeads: ${this.subscriptionId}`);
          return;
        }

        // Block notification
        if (msg.method === "eth_subscription" && msg.params?.result) {
          const block = msg.params.result;
          const update: BlockUpdate = {
            type: "newBlock",
            blockNumber: block.number || "0x0",
            blockHash: block.hash || "0x0",
            timestamp: Date.now(),
            transactionCount: block.transactions?.length || 0,
            transactions: block.transactions || [],
          };

          this.listeners.forEach((listener) => {
            try {
              listener(update);
            } catch (err) {
              console.error("Error in block listener:", err);
            }
          });
        }
      } catch {
        // Ignore parse errors for non-JSON messages
      }
    });

    this.ws.on("error", (err) => {
      console.error("❌ WebSocket error:", err.message);
    });

    this.ws.on("close", () => {
      this.isConnecting = false;
      this.ws = null;
      this.subscriptionId = null;
      console.log("🔌 WebSocket disconnected. Reconnecting in 5s...");

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 5000);
    });
  }

  /**
   * Register a listener for new block updates.
   */
  onBlock(listener: BlockListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Disconnect from the WebSocket.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners = [];
  }

  /**
   * Check if the client is connected.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const flashblocksWs = new FlashblocksClient();
