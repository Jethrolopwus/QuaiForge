"use client";

/**
 * PayWithBlipButton — README §Frontend /components
 * Entry point, embeddable in any host page. A merchant drops this one
 * component in with an order; everything else (invoice, hand-off,
 * confirmation, receipt) is handled by the widget.
 *
 * `wallet` is optional. When provided (e.g. from a page that already uses
 * useWallet in the Navbar), the checkout skips the quai_requestAccounts
 * prompt and uses the pre-connected provider/address directly.
 *
 * `isWrongChain` and `switchChain` are forwarded from the host page's
 * useWallet() call so CheckoutModal can surface a chain-switch prompt
 * instead of letting the user hit a cryptic RPC error.
 */

import { useState } from "react";
import { quais } from "quais";
import { useInvoice } from "@/hooks/useInvoice";
import { CheckoutModal } from "./CheckoutModal";
import type { Eip1193Provider } from "@/lib/BlipProviderDetector";

export interface PayWithBlipOrder {
  merchantAddress: string;
  amountWei: bigint;
  orderRef: string;
  itemName: string;
}

export interface WalletContext {
  provider: Eip1193Provider | null;
  address: string | null;
}

export function PayWithBlipButton({
  order,
  wallet,
  isWrongChain,
  switchChain,
}: {
  order: PayWithBlipOrder;
  wallet?: WalletContext;
  /** True when the connected wallet is on the wrong chain (not Cyprus-1). */
  isWrongChain?: boolean;
  /** Triggers wallet_switchEthereumChain — forwarded to CheckoutModal. */
  switchChain?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { state, startCheckout, cancel, reset, insideBlip } = useInvoice(order, wallet);

  const amountQuai = quais.formatQuai(order.amountWei);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-warm-brown px-4 py-3 font-semibold text-white shadow-glow-sm transition hover:bg-warm-brown hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2 focus:ring-offset-forge-ink"
      >
        <BlipGlyph />
        Pay with Blip
        <span className="font-mono text-sm opacity-80">
          · {amountQuai}
        </span>
      </button>

      <CheckoutModal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        state={state}
        startCheckout={startCheckout}
        cancel={cancel}
        insideBlip={insideBlip}
        isWrongChain={isWrongChain}
        switchChain={switchChain}
        order={order}
      />
    </>
  );
}

function BlipGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
