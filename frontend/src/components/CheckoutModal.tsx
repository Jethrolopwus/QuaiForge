"use client";

/**
 * CheckoutModal — README §Frontend /components
 * Order summary, QR/deep-link hand-off, live status.
 *
 * Signature element: the dual confirmation rails. The architecture verifies
 * payment from two independent sources in parallel (README §Resilience
 * Notes) — the modal renders each source as its own live track so the
 * resilience mechanism is visible, not hidden behind a spinner.
 */

import { useEffect } from "react";
import { quais } from "quais";
import type { CheckoutState, RailState } from "@/hooks/useInvoice";
import { useBlipDeepLink } from "@/hooks/useBlipDeepLink";
import { ReceiptCard } from "./ReceiptCard";

export function CheckoutModal(props: {
  open: boolean;
  onClose: () => void;
  state: CheckoutState;
  startCheckout: () => void;
  insideBlip: boolean;
  order: {
    merchantAddress: string;
    amountWei: bigint;
    orderRef: string;
    itemName: string;
  };
}) {
  const { open, onClose, state, order } = props;
  const { openInBlipLink } = useBlipDeepLink({
    merchantAddress: order.merchantAddress,
    invoiceRef: order.orderRef,
    title: order.itemName,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const amountQuai = quais.formatQuai(order.amountWei);
  const busy =
    state.step === "creating" ||
    state.step === "awaitingPayment" ||
    state.step === "verifying" ||
    state.step === "confirming";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="QuaiForge checkout"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-forge-line bg-forge-ink shadow-glow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-forge-line px-6 py-4">
          <div className="flex items-center gap-2">
            <ForgeMark />
            <span className="font-semibold text-white">
              Quai<span className="text-forge-primary">Forge</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-forge-mist">
              checkout
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close checkout"
            className="rounded p-1 text-forge-mist hover:text-white focus:outline-none focus:ring-2 focus:ring-forge-primary disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6">
          {state.step === "confirmed" ? (
            <ReceiptCard
              amountWei={order.amountWei}
              orderRef={order.orderRef}
              merchantAddress={order.merchantAddress}
              paymentTxHash={state.paymentTxHash}
              confirmTxHash={state.confirmTxHash}
              payer={state.payer}
              demoMode={state.demoMode}
            />
          ) : (
            <>
              {/* Order summary */}
              <div className="mb-6 rounded-xl border border-forge-line bg-forge-dark p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-neutral-300">{order.itemName}</span>
                  <span className="font-mono text-lg font-semibold text-forge-primary">
                    {amountQuai} QUAI
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-forge-mist">
                  Order {order.orderRef}
                </p>
              </div>

              {/* Dual confirmation rails */}
              {state.step !== "idle" && state.step !== "failed" && (
                <div className="mb-6 space-y-3">
                  <Rail
                    label="Blip payment"
                    detail={railDetailBlip(state)}
                    state={state.blipRail}
                  />
                  <Rail
                    label="On-chain record"
                    detail={railDetailChain(state)}
                    state={state.chainRail}
                  />
                </div>
              )}

              {/* Error */}
              {state.step === "failed" && (
                <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-red-400">
                    Payment not completed
                  </p>
                  {state.error}
                </div>
              )}

              {/* Actions */}
              {state.step === "idle" && (
                <div className="space-y-3">
                  <button
                    onClick={props.startCheckout}
                    className="w-full rounded-xl bg-forge-secondary py-3.5 font-semibold text-forge-ink shadow-glow-sm transition hover:bg-forge-primary focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2 focus:ring-offset-forge-ink"
                  >
                    Pay {amountQuai} QUAI
                  </button>
                  {!props.insideBlip && (
                    <a
                      href={openInBlipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-xl border border-forge-accent py-3 text-center text-sm text-forge-primary transition hover:border-forge-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-forge-primary"
                    >
                      Open in Blip app
                    </a>
                  )}
                </div>
              )}

              {state.step === "failed" && (
                <button
                  onClick={props.startCheckout}
                  className="w-full rounded-xl bg-forge-secondary py-3.5 font-semibold text-forge-ink transition hover:bg-forge-primary focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2 focus:ring-offset-forge-ink"
                >
                  Try again
                </button>
              )}

              {busy && (
                <p className="text-center font-mono text-[11px] uppercase tracking-widest text-forge-mist">
                  {busyLabel(state.step)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-forge-line px-6 py-3 text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-forge-mist">
            Non-custodial · wallet-to-wallet on Quai
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function busyLabel(step: CheckoutState["step"]): string {
  switch (step) {
    case "creating":
      return "Creating invoice on PaymentRegistry…";
    case "awaitingPayment":
      return "Waiting for approval in wallet…";
    case "verifying":
      return "Verifying payment on-chain…";
    case "confirming":
      return "Recording confirmation…";
    default:
      return "";
  }
}

function railDetailBlip(state: CheckoutState): string {
  if (state.blipRail === "done") return "Payment sent and included";
  if (state.blipRail === "active")
    return state.step === "awaitingPayment"
      ? "Approve in your wallet"
      : "Waiting for inclusion…";
  if (state.blipRail === "error") return "Did not complete";
  return "Waiting";
}

function railDetailChain(state: CheckoutState): string {
  if (state.chainRail === "done") return "PaymentConfirmed event received";
  if (state.chainRail === "active") return "Listening on Orchard (WSS)…";
  if (state.chainRail === "error") return "Did not complete";
  return "Starts after payment";
}

function Rail(props: { label: string; detail: string; state: RailState }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-forge-line bg-forge-dark px-4 py-3">
      <RailDot state={props.state} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{props.label}</p>
        <p className="truncate font-mono text-[11px] text-forge-mist">
          {props.detail}
        </p>
      </div>
    </div>
  );
}

function RailDot({ state }: { state: RailState }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forge-primary text-forge-ink">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 8.5L6.5 12L13 4.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "error") {
    return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-red-500/70" />;
  }
  if (state === "active") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-3 w-3 animate-pulse-dot rounded-full bg-forge-primary shadow-glow-sm" />
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-forge-line" />;
}

function ForgeMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/quaiforge-mark.png"
      alt=""
      aria-hidden
      className="h-6 w-6 rounded-full"
    />
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
