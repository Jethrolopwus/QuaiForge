"use client";

/**
 * ReceiptCard — README §Frontend /components
 * Final confirmation UI: transaction hash · amount · Quaiscan link
 * (README flow step 7).
 */

import { quais } from "quais";
import { quaiscanTxUrl } from "@/lib/quaisClient";

function shorten(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

export function ReceiptCard(props: {
  amountWei: bigint;
  orderRef: string;
  merchantAddress: string;
  paymentTxHash: string | null;
  confirmTxHash: string | null;
  payer: string | null;
  demoMode: boolean;
}) {
  const amountQuai = quais.formatQuai(props.amountWei);

  return (
    <div className="rounded-2xl border border-forge-line bg-forge-dark p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forge-primary text-forge-ink shadow-glow-sm">
          <CheckIcon />
        </span>
        <div>
          <p className="font-semibold text-white">Payment confirmed</p>
          <p className="font-mono text-xs uppercase tracking-widest text-forge-primary">
            Recorded on Quai · Orchard
          </p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <Row label="Amount" value={`${amountQuai} QUAI`} strong />
        <Row label="Order" value={props.orderRef} />
        {props.payer && <Row label="Paid by" value={shorten(props.payer)} mono />}
        {props.paymentTxHash && (
          <Row
            label="Payment tx"
            value={shorten(props.paymentTxHash)}
            mono
            href={props.demoMode ? undefined : quaiscanTxUrl(props.paymentTxHash)}
          />
        )}
        {props.confirmTxHash && (
          <Row
            label="Registry tx"
            value={shorten(props.confirmTxHash)}
            mono
            href={props.demoMode ? undefined : quaiscanTxUrl(props.confirmTxHash)}
          />
        )}
      </dl>

      {props.demoMode && (
        <p className="mt-5 rounded-lg border border-forge-line bg-forge-ink px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-forge-mist">
          Simulated receipt — deploy PaymentRegistry and set
          NEXT_PUBLIC_CONTRACT_ADDRESS for live Quaiscan links
        </p>
      )}
    </div>
  );
}

function Row(props: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  href?: string;
}) {
  const valueEl = props.href ? (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-forge-primary underline decoration-forge-accent underline-offset-2 hover:text-white"
    >
      {props.value} ↗
    </a>
  ) : (
    <span className={props.strong ? "font-semibold text-white" : "text-neutral-200"}>
      {props.value}
    </span>
  );

  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-xs uppercase tracking-wider text-forge-mist">
        {props.label}
      </dt>
      <dd className={props.mono ? "font-mono text-xs" : ""}>{valueEl}</dd>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
