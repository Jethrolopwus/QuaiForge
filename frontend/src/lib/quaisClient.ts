/**
 * quaisClient — README §Frontend /lib
 *
 * JsonRpcProvider / WebSocketProvider instances against Orchard testnet
 * (Chain ID 15000, Cyprus-1 shard). The WSS endpoint is preferred for the
 * PaymentConfirmed event listener — near-instant delivery instead of polling
 * (README §Network Details note).
 */

import { quais } from "quais";

export const ORCHARD = {
  chainId: 15000,
  rpcHttp:
    process.env.NEXT_PUBLIC_ORCHARD_RPC_HTTP ??
    "https://orchard.rpc.quai.network/cyprus1",
  rpcWss:
    process.env.NEXT_PUBLIC_ORCHARD_RPC_WSS ??
    "wss://orchard.rpc.quai.network/cyprus1",
  explorer: "https://orchard.quaiscan.io",
} as const;

let httpProvider: quais.JsonRpcProvider | null = null;

/** Shared read-only HTTP provider (lazily created, browser-safe). */
export function getHttpProvider(): quais.JsonRpcProvider {
  if (!httpProvider) {
    httpProvider = new quais.JsonRpcProvider(ORCHARD.rpcHttp, undefined, {
      usePathing: true,
    });
  }
  return httpProvider;
}

/**
 * Fresh WebSocket provider for event subscriptions. Caller owns its
 * lifecycle and must call destroy() when finished to close the socket.
 */
export function createWssProvider(): quais.WebSocketProvider {
  return new quais.WebSocketProvider(ORCHARD.rpcWss);
}

/** Quaiscan URL helpers for the ReceiptCard. */
export function quaiscanTxUrl(txHash: string): string {
  return `${ORCHARD.explorer}/tx/${txHash}`;
}

export function quaiscanAddressUrl(address: string): string {
  return `${ORCHARD.explorer}/address/${address}`;
}
