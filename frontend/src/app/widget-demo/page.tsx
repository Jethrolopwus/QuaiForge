"use client";

/**
 * /widget-demo — Merchant storefront demo in the cream + dark-green Figma palette.
 *
 * This page uses the same design language as the landing page: DM Serif Display
 * headings, Cormorant Garamond body copy, cream background, dark-green accents,
 * gold dividers. The embedded PayWithBlipButton is the only QuaiForge UI element
 * on each product card — exactly how a real merchant would integrate it.
 *
 * Startup checks surfaced here:
 *   • getContractConfigWarning() — shown as an amber banner if the contract
 *     address is missing or invalid (dev/staging only; production should have
 *     this set in .env.local before launch).
 *   • isWrongChain / switchChain — forwarded to every PayWithBlipButton so
 *     the checkout modal can prompt for a network switch before blocking the
 *     user with a cryptic RPC error.
 */

import { quais } from "quais";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ShoppingBag, MapPin, Star, ArrowRight, AlertTriangle } from "lucide-react";
import {
  PayWithBlipButton,
  type PayWithBlipOrder,
} from "@/components/PayWithBlipButton";
import { Footer } from "@/components/Footer";
import { useWallet } from "@/hooks/useWallet";
import { getContractConfigWarning } from "@/lib/paymentRegistry";

/* ─── Animation variants ─────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Merchant address ───────────────────────────────────── */
const MERCHANT_ADDRESS =
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

/* ─── Product data ───────────────────────────────────────── */
interface Product {
  name: string;
  description: string;
  priceQuai: string;
  orderRef: string;
  badge?: string;
  rating: number;
  category: string;
  /** gradient colors for the product illustration */
  gradientFrom: string;
  gradientTo: string;
  svgAccent: string;
}

const PRODUCTS: Product[] = [
  {
    name: "Agbada — Royal Indigo",
    description:
      "Hand-embroidered three-piece agbada, brocade finish. Crafted by master tailors in Jos, Plateau State.",
    priceQuai: "45",
    orderRef: "JNW-AGB-001",
    badge: "Best Seller",
    rating: 5,
    category: "Traditional Wear",
    gradientFrom: "#2C4870",
    gradientTo: "#0F172A",
    svgAccent: "#7BA4D4",
  },
  {
    name: "Senator Kaftan — Onyx",
    description:
      "Slim-cut senator wear in premium cashmere-touch fabric. Understated elegance for every occasion.",
    priceQuai: "28",
    orderRef: "JNW-KFT-002",
    badge: "New Arrival",
    rating: 4,
    category: "Contemporary",
    gradientFrom: "#2D2D2D",
    gradientTo: "#0a0a0a",
    svgAccent: "#9CA3AF",
  },
  {
    name: "Ankara Two-Piece — Plateau Dawn",
    description:
      "Bold wax-print set in sunrise colours, tailored to order in Jos. Ships nationwide within 5 days.",
    priceQuai: "19",
    orderRef: "JNW-ANK-003",
    badge: "Limited",
    rating: 5,
    category: "Ankara",
    gradientFrom: "#8A4A22",
    gradientTo: "#3D1A08",
    svgAccent: "#F59E0B",
  },
];

/* ─── Inline garment illustration ───────────────────────── */
function GarmentIllustration({
  gradientFrom,
  gradientTo,
  svgAccent,
  name,
}: {
  gradientFrom: string;
  gradientTo: string;
  svgAccent: string;
  name: string;
}) {
  return (
    <div
      className="relative w-full h-52 overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
      role="img"
      aria-label={`${name} product illustration`}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Decorative SVG garment shape */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Abstract fabric silhouette */}
        <path
          d="M60 40 L80 20 L100 30 L120 20 L140 40 L130 60 L150 80 L150 160 L50 160 L50 80 L70 60 Z"
          fill={svgAccent}
          fillOpacity="0.18"
          stroke={svgAccent}
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        {/* Collar */}
        <path
          d="M85 30 Q100 45 115 30"
          stroke={svgAccent}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
        {/* Embroidery patterns */}
        <circle cx="100" cy="75" r="3" fill={svgAccent} fillOpacity="0.5" />
        <circle cx="88" cy="85" r="2" fill={svgAccent} fillOpacity="0.4" />
        <circle cx="112" cy="85" r="2" fill={svgAccent} fillOpacity="0.4" />
        <circle cx="80" cy="100" r="2" fill={svgAccent} fillOpacity="0.3" />
        <circle cx="120" cy="100" r="2" fill={svgAccent} fillOpacity="0.3" />
        {/* Pattern rows */}
        <path d="M70 115 L130 115" stroke={svgAccent} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 4" />
        <path d="M65 130 L135 130" stroke={svgAccent} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 4" />
        <path d="M70 145 L130 145" stroke={svgAccent} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 4" />
      </svg>
      {/* Price tag floating element */}
      <div className="absolute top-4 right-4 rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm px-3 py-1.5">
        <span
          className="text-white font-semibold text-sm"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          {/* price shown in card below */}
        </span>
      </div>
    </div>
  );
}

/* ─── Star rating ────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-gold-line text-gold-line" : "text-green-deep/20"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

/* ─── Product card ───────────────────────────────────────── */
function ProductCard({
  product,
  isWrongChain,
  switchChain,
  walletContext,
}: {
  product: Product;
  isWrongChain?: boolean;
  switchChain?: () => void;
  walletContext?: { provider: import("@/lib/BlipProviderDetector").Eip1193Provider | null; address: string | null };
}) {
  const order: PayWithBlipOrder = {
    merchantAddress: MERCHANT_ADDRESS,
    amountWei: quais.parseQuai(product.priceQuai),
    orderRef: product.orderRef,
    itemName: product.name,
  };

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="flex flex-col overflow-hidden rounded-2xl border border-green-deep/10 bg-cream shadow-card transition-shadow hover:shadow-[0_8px_40px_rgba(27,58,45,0.12)]"
    >
      {/* Product illustration */}
      <GarmentIllustration
        gradientFrom={product.gradientFrom}
        gradientTo={product.gradientTo}
        svgAccent={product.svgAccent}
        name={product.name}
      />

      {/* Card content */}
      <div className="flex flex-1 flex-col p-6 gap-3">
        {/* Category + badge row */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs uppercase tracking-widest text-green-deep/45"
            style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
          >
            {product.category}
          </span>
          {product.badge && (
            <span
              className="rounded-full border border-gold-line/40 bg-gold-line/8 px-2.5 py-0.5 text-xs text-warm-brown"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
            >
              {product.badge}
            </span>
          )}
        </div>

        {/* Name */}
        <h2
          className="text-xl text-green-deep leading-snug"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
        >
          {product.name}
        </h2>

        {/* Rating */}
        <StarRating rating={product.rating} />

        {/* Description */}
        <p
          className="flex-1 text-green-deep/60 leading-relaxed"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.98rem", lineHeight: 1.65 }}
        >
          {product.description}
        </p>

        {/* Gold divider */}
        <div className="h-px bg-gold-line/25 my-1" />

        {/* Price + order ref row */}
        <div className="flex items-baseline justify-between">
          <span
            className="text-2xl text-green-deep"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
          >
            {product.priceQuai}{" "}
            <span className="text-base text-green-deep/50">QUAI</span>
          </span>
          <span
            className="text-xs text-green-deep/35 uppercase tracking-wider"
            style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
          >
            {product.orderRef}
          </span>
        </div>

        {/* Embedded QuaiForge widget */}
        <PayWithBlipButton
          order={order}
          wallet={walletContext}
          isWrongChain={isWrongChain}
          switchChain={switchChain}
        />
      </div>
    </motion.article>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function WidgetDemoPage() {
  const gridRef = useRef(null);
  const gridInView = useInView(gridRef, { once: true, margin: "0px 0px -60px 0px" });

  // Wallet state — forwarded to every PayWithBlipButton so CheckoutModal
  // can surface a wrong-chain banner instead of a cryptic RPC error.
  const wallet = useWallet();
  const walletContext = wallet.isConnected
    ? { provider: wallet.provider, address: wallet.address }
    : undefined;

  // Contract config warning — shown as a sticky amber banner at the top of
  // the page if NEXT_PUBLIC_CONTRACT_ADDRESS is missing or malformed.
  const configWarning = getContractConfigWarning();

  return (
    <main className="bg-cream min-h-screen overflow-x-hidden">
      {/* ── Contract config warning banner ──────────────────── */}
      {configWarning && (
        <div className="sticky top-0 z-40 flex items-start gap-3 bg-amber-950/95 px-6 py-3 backdrop-blur-sm border-b border-amber-500/30">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-sm text-amber-200">
            <span className="font-semibold text-amber-300">Config warning: </span>
            {configWarning}
          </p>
        </div>
      )}
      {/* Merchant hero header */}
      <section className="relative pt-28 pb-16 bg-cream overflow-hidden">
        {/* Decorative bg blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-20 right-0 h-80 w-80 rounded-full bg-green-deep/5 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-10 h-48 w-48 rounded-full bg-gold-line/8 blur-2xl"
        />

        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            {/* Breadcrumb */}
            <motion.div variants={fadeIn} className="flex items-center gap-2">
              <span
                className="text-xs uppercase tracking-widest text-green-deep/40"
                style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
              >
                Home
              </span>
              <ArrowRight size={11} className="text-green-deep/30" />
              <span
                className="text-xs uppercase tracking-widest text-green-deep/65"
                style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
              >
                Merchant Demo
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <h1
                  className="text-4xl md:text-5xl text-green-deep leading-tight"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
                >
                  Jos Native Wears
                </h1>
                <div className="flex items-center gap-3 mt-3">
                  <MapPin size={14} className="text-gold-line" />
                  <span
                    className="text-sm text-green-deep/55"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Tailored in Plateau State · Ships nationwide
                  </span>
                </div>
              </div>

              {/* Accepts QUAI badge */}
              <div className="flex items-center gap-2 rounded-full border border-forge-primary/30 bg-forge-primary/8 px-5 py-2.5">
                <span className="h-2 w-2 rounded-full bg-forge-primary animate-pulse-dot" />
                <span
                  className="text-xs uppercase tracking-widest text-forge-primary"
                  style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
                >
                  Accepts QUAI
                </span>
              </div>
            </motion.div>

            <motion.p
              variants={fadeIn}
              className="max-w-xl text-green-deep/60 leading-relaxed mt-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", lineHeight: 1.75 }}
            >
              Pay directly from your Blip wallet — no card, no checkout
              account. Powered by the embedded{" "}
              <span className="text-green-deep font-medium">QuaiForge</span>{" "}
              widget.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Gold section divider */}
      <div className="mx-auto max-w-6xl px-6">
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #B87333 30%, #B87333 70%, transparent 100%)", opacity: 0.3 }}
        />
      </div>

      {/* Product grid */}
      <section ref={gridRef} className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={gridInView ? "visible" : "hidden"}
          className="flex flex-col gap-10"
        >
          {/* Grid heading */}
          <motion.div variants={fadeIn} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-green-deep/50" />
              <h2
                className="text-2xl text-green-deep"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
              >
                New Arrivals
              </h2>
            </div>
            <span
              className="text-xs uppercase tracking-widest text-green-deep/35"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
            >
              {PRODUCTS.length} items
            </span>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <ProductCard
                key={p.orderRef}
                product={p}
                walletContext={walletContext}
                isWrongChain={wallet.isWrongChain}
                switchChain={wallet.switchChain}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Powered-by strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-cream-dark border-t border-green-deep/8 py-8"
      >
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-widest text-green-deep/40"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
            >
              Checkout powered by
            </span>
            <span
              className="text-sm text-green-deep font-normal"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Quai<span className="text-forge-primary">Forge</span>
            </span>
            <span
              className="text-xs uppercase tracking-wider text-green-deep/35"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
            >
              · Orchard Testnet
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-forge-primary animate-pulse-dot" />
            <span
              className="text-xs text-green-deep/40"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.08em" }}
            >
              Non-custodial · Wallet-to-wallet
            </span>
          </div>
        </div>
      </motion.div>

      <Footer />
    </main>
  );
}
