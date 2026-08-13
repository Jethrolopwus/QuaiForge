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

export function useInvoice(order: {
  merchantAddress: string;
  amountWei: bigint;
  orderRef: string;
}) {
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
    const injected: Eip1193Provider | null = getInjectedProvider();

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
      const accounts = (await injected.request({
        method: "quai_requestAccounts",
      })) as string[];
      const from = accounts[0];

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
  }, [order.merchantAddress, order.amountWei, order.orderRef]);

  const insideBlip = typeof window !== "undefined" && getBlip() !== null;

  return { state, startCheckout, reset, insideBlip };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
