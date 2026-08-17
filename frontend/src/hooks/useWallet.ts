"use client";

/**
 * useWallet — global wallet connection state
 *
 * Supports Blip (mobile in-app browser) and Pelagus (browser extension).
 *
 * Provider priority:
 *   1. window.quai with isBlip / _isSwiftBlip  → Blip in-app browser
 *   2. window.pelagus                           → Pelagus extension
 *   3. window.quai / window.ethereum            → other Quai-compatible wallet
 *
 * The hook also announces via EIP-6963 so future multi-wallet enumeration
 * (Phase 6) can layer on top without touching callers.
 *
 * Status machine:
 *   idle → connecting → connected
 *             └→ error
 *
 * "Disconnect" is UI-only: neither Blip nor Pelagus exposes a programmatic
 * revoke API, so disconnect() simply clears local state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Eip1193Provider } from "@/lib/BlipProviderDetector";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export type WalletKind = "blip" | "pelagus" | "other";

export interface WalletState {
  status: WalletStatus;
  /** Connected address, or null when not connected. */
  address: string | null;
  /** Hex chain id, e.g. "0x9" for Cyprus-1. */
  chainId: string | null;
  /** Which wallet is injecting the provider. */
  kind: WalletKind | null;
  /** True when running inside Blip's in-app browser. */
  isBlip: boolean;
  /** True when Pelagus extension is detected (desktop). */
  hasPelagus: boolean;
  /** The raw EIP-1193 provider (null when none detected). */
  provider: Eip1193Provider | null;
  /** Last error message, if status === "error". */
  error: string | null;
}

const INITIAL: WalletState = {
  status: "idle",
  address: null,
  chainId: null,
  kind: null,
  isBlip: false,
  hasPelagus: false,
  provider: null,
  error: null,
};

/** Cyprus-1 chain id on Orchard testnet (also mainnet Cyprus-1). */
export const EXPECTED_CHAIN_ID = "0x9";

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(): {
  provider: Eip1193Provider | null;
  kind: WalletKind | null;
  isBlip: boolean;
  hasPelagus: boolean;
} {
  if (typeof window === "undefined") {
    return { provider: null, kind: null, isBlip: false, hasPelagus: false };
  }

  const quai = window.quai;
  const pelagus = window.pelagus;
  const ethereum = window.ethereum;

  const blipCandidate = quai || pelagus || ethereum;
  const isBlip = Boolean(
    blipCandidate && (blipCandidate.isBlip || blipCandidate._isSwiftBlip)
  );
  const hasPelagus = Boolean(pelagus);

  if (isBlip) {
    return { provider: blipCandidate!, kind: "blip", isBlip: true, hasPelagus };
  }
  if (pelagus) {
    return { provider: pelagus, kind: "pelagus", isBlip: false, hasPelagus: true };
  }
  if (quai) {
    return { provider: quai, kind: "other", isBlip: false, hasPelagus: false };
  }
  if (ethereum) {
    return { provider: ethereum, kind: "other", isBlip: false, hasPelagus: false };
  }
  return { provider: null, kind: null, isBlip: false, hasPelagus: false };
}

function shortError(e: unknown): string {
  if (e instanceof Error) {
    const code = (e as Error & { code?: number }).code;
    if (code === 4001) return "Connection rejected by user";
    return e.message.length > 120 ? e.message.slice(0, 120) + "…" : e.message;
  }
  return "Unknown error";
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);
  // Track whether we've already tried silent session restore
  const restoredRef = useRef(false);

  // ── Initialise provider detection on mount ────────────────────────────────
  useEffect(() => {
    const detected = detectProvider();
    setState((s) => ({
      ...s,
      kind: detected.kind,
      isBlip: detected.isBlip,
      hasPelagus: detected.hasPelagus,
      provider: detected.provider,
    }));

    // Silent session restore: check quai_accounts without prompting
    if (detected.provider && !restoredRef.current) {
      restoredRef.current = true;
      detected.provider
        .request({ method: "quai_accounts" })
        .then((accounts) => {
          const list = accounts as string[];
          if (list && list.length > 0) {
            // Also read chainId so the badge is correct immediately
            detected.provider!
              .request({ method: "quai_chainId" })
              .then((cid) => {
                setState((s) => ({
                  ...s,
                  status: "connected",
                  address: list[0],
                  chainId: cid as string,
                }));
              })
              .catch(() => {
                setState((s) => ({
                  ...s,
                  status: "connected",
                  address: list[0],
                  chainId: null,
                }));
              });
          }
        })
        .catch(() => {
          // No prior session — stay idle
        });
    }
  }, []);

  // ── Subscribe to wallet events ────────────────────────────────────────────
  useEffect(() => {
    const { provider } = state;
    if (!provider?.on) return;

    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list || list.length === 0) {
        // User locked/disconnected in the extension
        setState((s) => ({
          ...s,
          status: "idle",
          address: null,
          chainId: null,
          error: null,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: "connected",
          address: list[0],
          error: null,
        }));
      }
    };

    const onChainChanged = (chainId: unknown) => {
      setState((s) => ({ ...s, chainId: chainId as string }));
    };

    const onDisconnect = () => {
      setState((s) => ({
        ...s,
        status: "idle",
        address: null,
        chainId: null,
        error: null,
      }));
    };

    provider.on("accountsChanged", onAccountsChanged as never);
    provider.on("chainChanged", onChainChanged as never);
    provider.on("disconnect", onDisconnect as never);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged as never);
      provider.removeListener?.("chainChanged", onChainChanged as never);
      provider.removeListener?.("disconnect", onDisconnect as never);
    };
  }, [state.provider]);

  // ── connect() ─────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    const detected = detectProvider();

    if (!detected.provider) {
      setState((s) => ({
        ...s,
        status: "error",
        error: "No Quai wallet detected",
      }));
      return;
    }

    setState((s) => ({
      ...s,
      status: "connecting",
      kind: detected.kind,
      isBlip: detected.isBlip,
      hasPelagus: detected.hasPelagus,
      provider: detected.provider,
      error: null,
    }));

    try {
      const accounts = (await detected.provider.request({
        method: "quai_requestAccounts",
      })) as string[];

      const chainId = (await detected.provider.request({
        method: "quai_chainId",
      })) as string;

      setState((s) => ({
        ...s,
        status: "connected",
        address: accounts[0] ?? null,
        chainId,
        error: null,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: shortError(e),
      }));
    }
  }, []);

  // ── disconnect() ─────────────────────────────────────────────────────────
  // UI-only — clears local state.
  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      status: "idle",
      address: null,
      chainId: null,
      error: null,
    }));
  }, []);

  // ── switchChain() ─────────────────────────────────────────────────────────
  const switchChain = useCallback(async () => {
    const { provider } = state;
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: EXPECTED_CHAIN_ID }],
      });
    } catch (e) {
      setState((s) => ({ ...s, error: shortError(e) }));
    }
  }, [state.provider]);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const isConnected = state.status === "connected" && state.address !== null;
  const isWrongChain =
    isConnected && state.chainId !== null && state.chainId !== EXPECTED_CHAIN_ID;
  const shortAddress = state.address
    ? `${state.address.slice(0, 6)}…${state.address.slice(-4)}`
    : null;

  return {
    ...state,
    connect,
    disconnect,
    switchChain,
    isConnected,
    isWrongChain,
    shortAddress,
  };
}
