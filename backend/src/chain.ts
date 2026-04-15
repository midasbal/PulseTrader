/**
 * X Layer Chain Definition & Viem Client Configuration
 *
 * Official docs:
 *   - Network info:  https://web3.okx.com/tr/xlayer/docs/developer/build-on-xlayer/network-information
 *   - RPC endpoints: https://web3.okx.com/tr/xlayer/docs/developer/rpc-endpoints/rpc-endpoints
 *   - Flashblocks:   https://web3.okx.com/tr/xlayer/docs/developer/flashblocks/overview
 *   - Builder Codes: https://web3.okx.com/tr/xlayer/docs/developer/builder-codes/integration
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
  type HttpTransport,
  type Chain,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { Attribution } from "ox/erc8021";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Chain Definitions (from official X Layer docs)
// ---------------------------------------------------------------------------

export const xlayerTestnet: Chain = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech/terigon"] },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

export const xlayerFlashblocks: Chain = defineChain({
  id: 1952,
  name: "X Layer Testnet Flashblocks",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.XLAYER_FLASHBLOCKS_RPC ||
          "https://testrpc.xlayer.tech/flashblocks",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

// ---------------------------------------------------------------------------
// Builder Code Data Suffix (ERC-8021)
// Docs: https://web3.okx.com/tr/xlayer/docs/developer/builder-codes/integration
// ---------------------------------------------------------------------------

const BUILDER_CODE = process.env.BUILDER_CODE || "PULSETRDRV1XLYR0";

let DATA_SUFFIX: `0x${string}` | undefined;
try {
  DATA_SUFFIX = Attribution.toDataSuffix({
    codes: [BUILDER_CODE],
  });
  console.log(`✅ Builder Code "${BUILDER_CODE}" → dataSuffix: ${DATA_SUFFIX}`);
} catch (err) {
  console.warn(
    `⚠️  Could not generate dataSuffix for builder code "${BUILDER_CODE}":`,
    err
  );
  DATA_SUFFIX = undefined;
}

// ---------------------------------------------------------------------------
// Account (Agentic Wallet)
// ---------------------------------------------------------------------------

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
if (!AGENT_PRIVATE_KEY) {
  console.warn("⚠️  AGENT_PRIVATE_KEY not set — wallet operations will fail.");
}

export const agentAccount: PrivateKeyAccount | null = AGENT_PRIVATE_KEY
  ? privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`)
  : null;

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/** Standard public client for reading chain state */
export const publicClient: PublicClient<HttpTransport, Chain> =
  createPublicClient({
    chain: xlayerTestnet,
    transport: http(
      process.env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon"
    ),
  }) as PublicClient<HttpTransport, Chain>;

/** Flashblocks public client for 200ms preconfirmation queries */
export const flashblocksClient: PublicClient<HttpTransport, Chain> =
  createPublicClient({
    chain: xlayerFlashblocks,
    transport: http(
      process.env.XLAYER_FLASHBLOCKS_RPC ||
        "https://testrpc.xlayer.tech/flashblocks"
    ),
  }) as PublicClient<HttpTransport, Chain>;

/** Wallet client for signing & sending transactions (with Builder Code) */
export const walletClient: WalletClient | null = agentAccount
  ? createWalletClient({
      account: agentAccount,
      chain: xlayerTestnet,
      transport: http(
        process.env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon"
      ),
      ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
    })
  : null;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const config = {
  chainId: 1952,
  rpcUrl: process.env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech/terigon",
  wssUrl: process.env.XLAYER_WSS_URL || "wss://xlayertestws.okx.com",
  flashblocksRpc:
    process.env.XLAYER_FLASHBLOCKS_RPC ||
    "https://testrpc.xlayer.tech/flashblocks",
  builderCode: BUILDER_CODE,
  dataSuffix: DATA_SUFFIX,
  pusdcAddress: process.env.PUSDC_ADDRESS as `0x${string}` | undefined,
  pwethAddress: process.env.PWETH_ADDRESS as `0x${string}` | undefined,
  explorerUrl: "https://www.oklink.com/xlayer-test",
  agentAddress: agentAccount?.address,
};
