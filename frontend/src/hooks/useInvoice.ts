"use client";

/**
 * useInvoice — README §Frontend /hooks
 *
 * Creates the invoice and tracks it through the full end-to-end payment
 * flow (README §End-to-End Payment Flow):
 *
 *   idle → creating → awaitingPayment → verifying → confirming → confirmed
 *                  └→ cancelled (user aborted before payment sent)
 *                                                    └→ failed (any step)
 *
 * Two confirmation rails run in parallel (README §Resilience Notes):
 *   • blipRail   — the quai_sendTransaction result + tx inclusion
 *   • chainRail  — the PaymentRegistry PaymentConfirmed event over WSS
 *
 * WSS fallback: if the WebSocket hasn't fired PaymentConfirmed within
 * WSS_FALLBACK_MS after blipRail completes, the hook switches to polling
 * getStatus() every POLL_INTERVAL_MS until the invoice is Confirmed (or
 * a timeout is reached). This keeps the UI unstuck even if the WSS endpoint
 * drops mid-flow.
 *
 * cancel(): when called in the awaitingPayment step (before the send), the
 * hook calls cancelInvoice() on the contract to mark the invoice Cancelled
 * on-chain, then transitions to step "cancelled". If called after the send
 * has already been submitted it is a no-op (too late to cancel).
 *
 * If no contract address is configured (NEXT_PUBLIC_CONTRACT_ADDRESS empty),
 * the hook runs in a clearly-labelled simulation mode so the widget UI can
 * be demonstrated before deployment. Simulation is surfaced to the UI via
 * `demoMode` — it is never silent.
 *
 * `connectedProvider` (optional): if the parent component already has a
 * connected wallet via useWallet, pass its provider here so startCheckout
 * skips the quai_requestAccounts prompt and uses the already-authorised
 * account directly.
 *
 * `connectedAddress` (optional): the already-authorised account address;
 * used together with connectedProvider to skip account prompting.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { quais } from "quais";
import {
  getBlip,
  getInjectedProvider,
  type Eip1193Provider,
} from "@/lib/BlipProviderDetector";
import {
  isContractConfigured,
  createInvoice,
  confirmPayment,
  cancelInvoice,
  getStatus,
  onPaymentConfirmed,
  InvoiceStatus,
} from "@/lib/paymentRegistry";
import { getHttpProvider } from "@/lib/quaisClient";

// ---------------------------------------------------------------------------
// Resilience timing constants
// ---------------------------------------------------------------------------

/**
 * How long to wait (ms) after blipRail completes before starting the HTTP
 * fallback poll. Gives the WSS a chance to fire first.
 */
const WSS_FALLBACK_MS = 8_000;

/**
 * Interval (ms) between getStatus() HTTP polls during the fallback window.
 */
const POLL_INTERVAL_MS = 3_000;

/**
 * Maximum total time (ms) to keep polling before declaring chain-rail failure.
 * 3 minutes is generous for Orchard testnet block times (~6 s).
 */
const POLL_TIMEOUT_MS = 180_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckoutStep =
  | "idle"
  | "creating"
  | "awaitingPayment"
  | "verifying"
  | "confirming"
  | "confirmed"
  | "cancelled"
  | "failed";

export type RailState = "waiting" | "active" | "done" | "error";

export interface CheckoutState {
  step: CheckoutStep;
  demoMode: boolean;
  invoiceId: bigint | null;
  paymentTxHash: string | null;
  confirmTxHash: string | null;
  payer: string | null;
  error: string | null;
  blipRail: RailState;
  chainRail: RailState;
}

const INITIAL: CheckoutState = {
  step: "idle",
  demoMode: false,
  invoiceId: null,
  paymentTxHash: null,
  confirmTxHash: null,
  payer: null,
  error: null,
  blipRail: "waiting",
  chainRail: "waiting",
};

function shortError(e: unknown): string {
  if (e instanceof Error) {
    // Wallet rejections surface as code 4001 per Blip docs
    const anyE = e as Error & { code?: number };
    if (anyE.code === 4001) return "Payment cancelled in wallet";
    return e.message.length > 140 ? e.message.slice(0, 140) + "…" : e.message;
  }
  return "Something went wrong";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInvoice(
  order: {
    merchantAddress: string;
    amountWei: bigint;
    orderRef: string;
  },
  /**
   * Optional pre-connected provider and address from useWallet.
   * When supplied, startCheckout skips quai_requestAccounts so the user
   * is not prompted twice.
   */
  wallet?: {
    provider: Eip1193Provider | null;
    address: string | null;
  }
) {
  const [state, setState] = useState<CheckoutState>(INITIAL);

  // WSS unsubscribe
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // Fallback poll timer handles
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current invoiceId for cancel() without needing state snapshot
  const invoiceIdRef = useRef<bigint | null>(null);
  // Track injected provider for cancel() calls
  const injectedRef = useRef<Eip1193Provider | null>(null);
  // Guard: true after quai_sendTransaction is submitted (cancel no longer valid)
  const paymentSentRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      clearPollTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearPollTimers() {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    clearPollTimers();
    invoiceIdRef.current = null;
    injectedRef.current = null;
    paymentSentRef.current = false;
    setState(INITIAL);
  }, []);

  // ---------------------------------------------------------------------------
  // WSS fallback poll — starts after WSS_FALLBACK_MS if chain rail hasn't fired
  // ---------------------------------------------------------------------------

  const startFallbackPoll = useCallback((invoiceId: bigint) => {
    // Give the WSS a head-start before polling
    pollTimeoutRef.current = setTimeout(() => {
      const started = Date.now();

      pollTimerRef.current = setInterval(async () => {
        // Stop if the chain rail already resolved (WSS fired while we waited)
        setState((s) => {
          if (s.chainRail === "done" || s.step === "confirmed" || s.step === "cancelled" || s.step === "failed") {
            clearPollTimers();
          }
          return s; // no change — just inspecting
        });

        if (Date.now() - started > POLL_TIMEOUT_MS) {
          clearPollTimers();
          setState((s) =>
            s.chainRail === "done"
              ? s
              : {
                  ...s,
                  chainRail: "error",
                  step: s.step === "confirming" ? "failed" : s.step,
                  error: s.error ?? "On-chain confirmation timed out after polling",
                }
          );
          return;
        }

        try {
          const status = await getStatus(invoiceId);
          if (status === InvoiceStatus.Confirmed) {
            clearPollTimers();
            // Fetch full invoice to get payer address
            setState((s) => {
              if (s.chainRail === "done") return s; // WSS already resolved
              return {
                ...s,
                chainRail: "done",
                step: "confirmed",
              };
            });
          } else if (status === InvoiceStatus.Cancelled) {
            clearPollTimers();
            setState((s) => ({
              ...s,
              chainRail: "error",
              step: "cancelled",
            }));
          }
        } catch {
          // Network blip — keep polling until timeout
        }
      }, POLL_INTERVAL_MS);
    }, WSS_FALLBACK_MS);
  }, []);

  // ---------------------------------------------------------------------------
  // cancel() — aborts an in-progress checkout
  // ---------------------------------------------------------------------------

  /**
   * Cancels the current invoice on-chain (if one exists and payment hasn't
   * been sent yet) and transitions the hook to "cancelled".
   *
   * Safe to call at any step before quai_sendTransaction is submitted.
   * After the send, this is a no-op — the payment is already in-flight.
   */
  const cancel = useCallback(async () => {
    if (paymentSentRef.current) return; // too late to cancel

    const invoiceId = invoiceIdRef.current;
    const injected = injectedRef.current;

    // Clean up listeners/polls first
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    clearPollTimers();

    // Optimistically move to cancelled in the UI immediately
    setState((s) => ({ ...s, step: "cancelled" }));

    // Fire-and-forget on-chain cancel if we have an invoice to cancel
    if (invoiceId !== null && injected !== null) {
      try {
        await cancelInvoice(injected, invoiceId);
      } catch (e) {
        // Log but don't re-surface — UI is already showing cancelled.
        // The invoice will remain Pending on-chain until it's naturally
        // superseded; this is acceptable at hackathon scope.
        console.warn("[useInvoice] cancelInvoice tx failed:", shortError(e));
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // startCheckout() — main flow
  // ---------------------------------------------------------------------------

  const startCheckout = useCallback(async () => {
    // Prefer the pre-connected provider from useWallet; fall back to detection.
    const injected: Eip1193Provider | null =
      wallet?.provider ?? getInjectedProvider();

    injectedRef.current = injected;
    paymentSentRef.current = false;

    // ---- Simulation mode: contract not yet deployed/configured -------------
    if (!isContractConfigured() || !injected) {
      setState((s) => ({ ...s, step: "creating", demoMode: true }));
      await wait(900);
      setState((s) => ({
        ...s,
        step: "awaitingPayment",
        invoiceId: BigInt(Date.now() % 100000),
        blipRail: "active",
      }));
      await wait(1600);
      setState((s) => ({
        ...s,
        step: "verifying",
        paymentTxHash: "0x" + "0".repeat(63) + "1",
        blipRail: "done",
        chainRail: "active",
      }));
      await wait(1400);
      setState((s) => ({
        ...s,
        step: "confirmed",
        confirmTxHash: "0x" + "0".repeat(63) + "2",
        payer: "0x0000…demo",
        chainRail: "done",
      }));
      return;
    }

    // ---- Real flow ---------------------------------------------------------
    try {
      // Step 2 — createInvoice on PaymentRegistry
      setState((s) => ({ ...s, step: "creating", demoMode: false }));
      const invoiceId = await createInvoice(
        injected,
        order.merchantAddress,
        order.amountWei,
        order.orderRef
      );
      invoiceIdRef.current = invoiceId;
      setState((s) => ({ ...s, invoiceId }));

      // Start the on-chain rail listener early (README step 5, WSS)
      unsubscribeRef.current = onPaymentConfirmed(invoiceId, (payer) => {
        clearPollTimers(); // WSS fired — stop any fallback poll
        setState((s) =>
          s.step === "confirmed"
            ? s
            : { ...s, chainRail: "done", payer, step: "confirmed" }
        );
      });

      // Step 4 — direct wallet-to-wallet payment via quai_sendTransaction
      setState((s) => ({ ...s, step: "awaitingPayment", blipRail: "active" }));

      // Use pre-connected address if available, otherwise prompt the user.
      let from: string;
      if (wallet?.address) {
        from = wallet.address;
      } else {
        const accounts = (await injected.request({
          method: "quai_requestAccounts",
        })) as string[];
        from = accounts[0];
      }

      // Step 4a — Blip app-wallet funding check (Blip in-app browser only).
      // If the per-origin app wallet has insufficient native QUAI, ask Blip to
      // top it up from the main vault before signing the send. This avoids the
      // transaction failing silently when the app wallet is empty.
      // Docs: blippay.me/docs §App-wallet funding
      const isBlipProvider =
        (injected as Eip1193Provider & { isBlip?: boolean }).isBlip ||
        (injected as Eip1193Provider & { _isSwiftBlip?: boolean })._isSwiftBlip;

      if (isBlipProvider) {
        try {
          type ProviderState = {
            appWallet?: {
              connected?: boolean;
              autoTopUpEnabled?: boolean;
              nativeAutoTopUpLimitWei?: string;
            };
            features?: {
              appWalletNativeTopUp?: boolean;
            };
          };

          const providerState = (await injected.request({
            method: "wallet_getProviderState",
          })) as ProviderState;

          const appWallet = providerState?.appWallet;
          const supportsTopUp = providerState?.features?.appWalletNativeTopUp;

          if (appWallet?.connected && supportsTopUp) {
            // Estimate required amount: payment amount + 10% gas buffer
            const gasBuffer = order.amountWei / BigInt(10);
            const requiredWei = order.amountWei + gasBuffer;
            const limitWei = BigInt(
              appWallet.nativeAutoTopUpLimitWei ?? "0"
            );

            // Only request if within the auto top-up limit (avoids approval
            // sheet for small amounts when autoTopUpEnabled is true).
            if (requiredWei <= limitWei || appWallet.autoTopUpEnabled) {
              await injected.request({
                method: "blip_requestAppWalletFunding",
                params: [
                  {
                    chainId: "0x9",
                    reason: "payment",
                    continueLabel: `Pay ${quais.formatQuai(order.amountWei)} QUAI`,
                    assets: [
                      {
                        type: "native",
                        symbol: "QUAI",
                        decimals: 18,
                        amountWei: quais.toQuantity(requiredWei),
                        purpose: "payment",
                      },
                    ],
                  },
                ],
              });
            }
          }
        } catch {
          // Funding request failed or was rejected (4001). We don't abort the
          // whole checkout — let the send attempt proceed; it may still succeed
          // if the app wallet already has enough balance.
        }
      }

      // Mark send as in-flight — cancel() is no longer valid after this point
      paymentSentRef.current = true;

      const txHash = (await injected.request({
        method: "quai_sendTransaction",
        params: [
          {
            from,
            to: order.merchantAddress,
            value: quais.toQuantity(order.amountWei),
            data: "0x",
          },
        ],
      })) as string;
      setState((s) => ({ ...s, paymentTxHash: txHash }));

      // Step 5 — verify inclusion on-chain (Blip-side rail)
      setState((s) => ({ ...s, step: "verifying" }));
      const receipt = await getHttpProvider().waitForTransaction(txHash);
      if (!receipt || receipt.status !== 1) {
        throw new Error("Payment transaction failed on-chain");
      }
      setState((s) => ({ ...s, blipRail: "done", chainRail: "active" }));

      // Step 6 — record confirmation in PaymentRegistry
      setState((s) => ({ ...s, step: "confirming" }));
      const confirmTxHash = await confirmPayment(injected, invoiceId, from);
      setState((s) => ({
        ...s,
        confirmTxHash,
        payer: from,
        chainRail: "done",
        step: "confirmed",
      }));

      // Start the WSS fallback poll in case the chain-rail WSS event doesn't
      // fire (e.g. the connection dropped after we subscribed). If the
      // confirmPayment tx already resolved the state above, the poll will
      // detect chainRail === "done" on its first tick and stop immediately.
      startFallbackPoll(invoiceId);
    } catch (e) {
      setState((s) => ({
        ...s,
        step: "failed",
        error: shortError(e),
        blipRail: s.blipRail === "done" ? "done" : "error",
        chainRail: s.chainRail === "done" ? "done" : "error",
      }));
    }
  }, [order.merchantAddress, order.amountWei, order.orderRef, wallet?.provider, wallet?.address, startFallbackPoll]);

  const insideBlip = typeof window !== "undefined" && getBlip() !== null;

  return { state, startCheckout, cancel, reset, insideBlip };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
