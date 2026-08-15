"use client";

/**
 * useInvoice — README §Frontend /hooks
 *
 * Creates the invoice and tracks it through the full end-to-end payment
 * flow (README §End-to-End Payment Flow):
 *
 *   idle → creating → awaitingPayment → verifying → confirming → confirmed
 *                                                     └→ failed (any step)
 *
 * Two confirmation rails run in parallel (README §Resilience Notes):
 *   • blipRail   — the quai_sendTransaction result + tx inclusion
 *   • chainRail  — the PaymentRegistry PaymentConfirmed event over WSS
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
  onPaymentConfirmed,
} from "@/lib/paymentRegistry";
import { getHttpProvider } from "@/lib/quaisClient";

export type CheckoutStep =
  | "idle"
  | "creating"
  | "awaitingPayment"
  | "verifying"
  | "confirming"
  | "confirmed"
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
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setState(INITIAL);
  }, []);

  /** Runs the full flow: create → pay → verify → confirm (README steps 2–6). */
  const startCheckout = useCallback(async () => {
    // Prefer the pre-connected provider from useWallet; fall back to detection.
    const injected: Eip1193Provider | null =
      wallet?.provider ?? getInjectedProvider();

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
      setState((s) => ({ ...s, invoiceId }));

      // Start the on-chain rail listener early (README step 5, WSS)
      unsubscribeRef.current = onPaymentConfirmed(invoiceId, (payer) => {
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
    } catch (e) {
      setState((s) => ({
        ...s,
        step: "failed",
        error: shortError(e),
        blipRail: s.blipRail === "done" ? "done" : "error",
        chainRail: s.chainRail === "done" ? "done" : "error",
      }));
    }
  }, [order.merchantAddress, order.amountWei, order.orderRef, wallet?.provider, wallet?.address]);

  const insideBlip = typeof window !== "undefined" && getBlip() !== null;

  return { state, startCheckout, reset, insideBlip };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
