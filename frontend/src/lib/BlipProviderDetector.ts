/**
 * BlipProviderDetector — README §Frontend /lib
 *
 * Blip aliases its injected EIP-1193 provider to window.quai, window.pelagus
 * and window.ethereum for compatibility. The isBlip / _isSwiftBlip flags are
 * what confirm the provider is actually Blip (and not another wallet that
 * also sets window.ethereum). Pattern taken directly from blippay.me/docs.
 */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
  isBlip?: boolean;
  _isSwiftBlip?: boolean;
}

declare global {
  interface Window {
    quai?: Eip1193Provider;
    pelagus?: Eip1193Provider;
    ethereum?: Eip1193Provider;
  }
}

/** Returns the Blip provider if the page is running inside Blip's in-app browser, else null. */
export function getBlip(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const p = window.quai || window.pelagus || window.ethereum;
  return p && (p.isBlip || p._isSwiftBlip) ? p : null;
}

/** Any injected Quai-compatible provider (Blip or Pelagus) — used as the signer source. */
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.quai || window.pelagus || window.ethereum || null;
}
