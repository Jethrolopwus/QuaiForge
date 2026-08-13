"use client";

/**
 * /widget-demo — README §Frontend /pages
 * Standalone demo page simulating a merchant storefront.
 *
 * The storefront is the demo persona from the design doc: a native-wears
 * fashion brand in Jos accepting an on-chain payment for the first time.
 * Everything on this page is the "host site"; the only QuaiForge element
 * is the embedded PayWithBlipButton on each product — exactly how a real
 * merchant would use the widget.
 */

import { quais } from "quais";
import {
  PayWithBlipButton,
  type PayWithBlipOrder,
} from "@/components/PayWithBlipButton";

const MERCHANT_ADDRESS =
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

interface Product {
  name: string;
  description: string;
  priceQuai: string;
  orderRef: string;
  swatch: string; // fabric accent for the placeholder art
}

const PRODUCTS: Product[] = [
  {
    name: "Agbada — Royal Indigo",
    description: "Hand-embroidered three-piece agbada, brocade finish.",
    priceQuai: "45",
    orderRef: "JNW-AGB-001",
    swatch: "#2C4870",
  },
  {
    name: "Senator Kaftan — Onyx",
    description: "Slim-cut senator wear in premium cashmere-touch fabric.",
    priceQuai: "28",
    orderRef: "JNW-KFT-002",
    swatch: "#22282E",
  },
  {
    name: "Ankara Two-Piece — Plateau Dawn",
    description: "Bold wax-print set, tailored to order in Jos.",
    priceQuai: "19",
    orderRef: "JNW-ANK-003",
    swatch: "#8A4A22",
  },
];

export default function WidgetDemoPage() {
  return (
    <main className="min-h-screen bg-forge-ink">
      {/* Merchant header — the "host site" */}
      <header className="border-b border-forge-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-lg font-bold text-white">Jos Native Wears</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-forge-mist">
              Tailored in Plateau · ships nationwide
            </p>
          </div>
          <span className="rounded-full border border-forge-accent/60 bg-forge-primary/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-forge-primary">
            Accepts QUAI
          </span>
        </div>
      </header>

      {/* Storefront */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold text-white">New arrivals</h1>
        <p className="mt-2 max-w-lg text-sm text-neutral-400">
          Pay directly from your Blip wallet — no card, no checkout account.
          Powered by the embedded QuaiForge widget.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.orderRef} product={p} />
          ))}
        </div>
      </div>

      <footer className="border-t border-forge-line py-6 text-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-forge-mist">
          Checkout powered by Quai
          <span className="text-forge-primary">Forge</span> · Orchard testnet
        </span>
      </footer>
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const order: PayWithBlipOrder = {
    merchantAddress: MERCHANT_ADDRESS,
    amountWei: quais.parseQuai(product.priceQuai),
    orderRef: product.orderRef,
    itemName: product.name,
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-forge-line bg-forge-dark">
      {/* Fabric placeholder art */}
      <div
        aria-hidden
        className="h-40 w-full"
        style={{
          background: `linear-gradient(135deg, ${product.swatch} 0%, #10161f 85%)`,
        }}
      >
        <div className="forge-grid h-full w-full opacity-60" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-semibold text-white">{product.name}</h2>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-neutral-400">
          {product.description}
        </p>
        <p className="mt-4 mb-4 font-mono text-sm text-forge-mist">
          {product.priceQuai} QUAI
          <span className="ml-2 text-[11px] uppercase tracking-wider">
            · {product.orderRef}
          </span>
        </p>

        {/* The embedded QuaiForge widget — one component, nothing else */}
        <PayWithBlipButton order={order} />
      </div>
    </article>
  );
}
