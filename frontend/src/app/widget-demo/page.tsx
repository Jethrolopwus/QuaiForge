"use client";

/**
 * /widget-demo — Multi-merchant storefront demo in the cream + dark-green Figma palette.
 *
 * Merchants are switched via a tab bar. Each merchant has its own products,
 * hero copy, and location — but they all share one MERCHANT_ADDRESS for
 * this demo (per your setup, a real multi-tenant version would give each
 * merchant its own payout address).
 */

import { quais } from "quais";
import { motion, useInView, Variants, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ShoppingBag, MapPin, Star, ArrowRight, AlertTriangle } from "lucide-react";
import {
  PayWithBlipButton,
  type PayWithBlipOrder,
} from "@/components/PayWithBlipButton";
import { Footer } from "@/components/Footer";
import { useWallet } from "@/hooks/useWallet";
import { getContractConfigWarning } from "@/lib/paymentRegistry";

/* ─── Animation variants ─────────────────────────────────── */
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Shared merchant address (demo) ─────────────────────── */
const MERCHANT_ADDRESS =
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

/* ─── Product + Merchant data ────────────────────────────── */
interface Product {
  name: string;
  description: string;
  priceQuai: string;
  orderRef: string;
  badge?: string;
  rating: number;
  category: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
  svgAccent: string;
}

interface Merchant {
  id: string;
  name: string;
  tagline: string;
  location: string;
  products: Product[];
}

const MERCHANTS: Merchant[] = [
  {
    id: "jos-native-wears",
    name: "Jos Native Wears",
    tagline:
      "Pay directly from your Blip wallet — no card, no checkout account.",
    location: "Tailored in Plateau State · Ships nationwide",
    products: [
      {
        name: "Agbada — Royal Indigo",
        description:
          "Hand-embroidered three-piece agbada, brocade finish. Crafted by master tailors in Jos, Plateau State.",
        priceQuai: "45",
        orderRef: "JNW-AGB-001",
        badge: "Best Seller",
        rating: 5,
        category: "Traditional Wear",
        image:
          "https://wp-media-dejiandkola.s3.eu-west-2.amazonaws.com/2025/10/dejiandkola_africa_1760519943_3743835091635139925_30014923707-433x516.jpg",
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
        image:
          "https://imgs.search.brave.com/ejruBgykMD6_w8qKjueHeGECEgS73pkwlYePYkwpHOM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93cC1t/ZWRpYS1kZWppYW5k/a29sYS5zMy5ldS13/ZXN0LTIuYW1hem9u/YXdzLmNvbS8yMDI1/LzEwLzA3NkE4MzA0/LTEtNDMzeDUxNi5q/cGc",
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
        image:
          "https://imgs.search.brave.com/vhttBvrx1cPgGu-ly3NwuIB7DhTgZV1qxy2hnbFxfCg/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2RiLzQz/LzljL2RiNDM5Y2E3/ZGIyYTg4ZDUwODkx/OTZhYjgzNWUxMGFm/LmpwZw",
        gradientFrom: "#8A4A22",
        gradientTo: "#3D1A08",
        svgAccent: "#F59E0B",
      },
    ],
  },
  {
    id: "plateau-leatherworks",
    name: "Plateau Leatherworks",
    tagline: "Full-grain leather goods, hand-tanned and stitched in Jos.",
    location: "Workshop in Jos North · Ships nationwide",
    products: [
      {
        name: "Weekender Duffel — Saddle Tan",
        description:
          "Full-grain cowhide duffel with brass hardware, built to age well over decades of travel.",
        priceQuai: "62",
        orderRef: "PLW-DUF-001",
        badge: "Best Seller",
        rating: 5,
        category: "Bags",
        image:
          "https://imgs.search.brave.com/tWO59n-h2TWWBQtadvfCyKlACtabMdA3buFwxi47OuY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9sb3R1/ZmZsZWF0aGVyLmNv/bS9jZG4vc2hvcC9m/aWxlcy9NR180Mzc5/XzIwMDB4LnByb2dy/ZXNzaXZlLmpwZz92/PTE3MTMyNzY4MDM",
        gradientFrom: "#5C3A21",
        gradientTo: "#2A1810",
        svgAccent: "#C99A6B",
      },
      {
        name: "Bifold Wallet — Espresso",
        description:
          "Slim hand-stitched bifold with six card slots and a coin pocket, cut from a single hide.",
        priceQuai: "12",
        orderRef: "PLW-WAL-002",
        rating: 4,
        category: "Accessories",
        image:
          "https://imgs.search.brave.com/MZTiV8mmc-CESzjFm4dHv8yBiHh21W9dQH6gyTdWR9c/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/ODFiSkV3VnVBeEwu/anBn",
        gradientFrom: "#3D2817",
        gradientTo: "#1A1109",
        svgAccent: "#9C7B4F",
      },
      {
        name: "Braided Belt — Cowhide Brown",
        description:
          "Hand-braided full-grain cowhide belt with a solid brass buckle, built to outlast the trend cycle.",
        priceQuai: "16",
        orderRef: "PLW-BLT-003",
        badge: "Limited",
        rating: 5,
        category: "Accessories",
        image:
          "https://imgs.search.brave.com/qQ5V4K8XFU2cha09QNnMRJ1sSvukTFZDbULzsATI1Cc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLmV0/c3lzdGF0aWMuY29t/LzIwMDE3Mjg5L3Iv/aWwvOGU1MDRjLzY1/NTkyMjM5NTUvaWxf/Nzk0eE4uNjU1OTIy/Mzk1NV9sZ2huLmpw/Zw",
        gradientFrom: "#4A3222",
        gradientTo: "#211408",
        svgAccent: "#B98A5E",
      },
    ],
  },
  {
    id: "highland-ceramics",
    name: "Highland Ceramics",
    tagline: "Hand-thrown stoneware fired in a wood kiln on the Jos plateau.",
    location: "Studio in Vom · Ships nationwide",
    products: [
      {
        name: "Glazed Serving Bowl — Ash Green",
        description:
          "Wood-fired stoneware bowl with a natural ash glaze; no two pieces are exactly alike.",
        priceQuai: "22",
        orderRef: "HLC-BWL-001",
        badge: "New Arrival",
        rating: 5,
        category: "Tableware",
        image:
          "https://imgs.search.brave.com/omaCSqT0hz9OPw48Qr6npnSDnmH07UI7k6nk01m19fo/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLmV0/c3lzdGF0aWMuY29t/LzExNzgxNTgzL3Iv/aWwvMWNiMTkzLzg2/ODU1NTM0OS9pbF8z/MDB4MzAwLjg2ODU1/NTM0OV9nMzYzLmpw/Zw",
        gradientFrom: "#3E4A3D",
        gradientTo: "#1B221A",
        svgAccent: "#8FAE87",
      },
      {
        name: "Stoneware Mug — Oatmeal Speckle",
        description:
          "Wheel-thrown mug with a matte speckled glaze; holds heat well and fits most drip cone filters.",
        priceQuai: "9",
        orderRef: "HLC-MUG-002",
        badge: "New Arrival",
        rating: 4,
        category: "Tableware",
        image:
          "https://imgs.search.brave.com/3wIxj4V-YNLPyrL2-GAxu38B3bB7L1nOIga80o3dWGo/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLmV0/c3lzdGF0aWMuY29t/LzIxMzc2MDI3L3Iv/aWwvNjZmMGQ5Lzc4/NTU5NzAzNTAvaWxf/MzAweDMwMC43ODU1/OTcwMzUwX2N5Y3Yu/anBn",
        gradientFrom: "#5A5142",
        gradientTo: "#26221B",
        svgAccent: "#C4B79A",
      },
      {
        name: "Carafe & Cup Set — Slate Blue",
        description:
          "Bedside water carafe with matching cup, dipped in a slate-blue glaze over dark stoneware clay.",
        priceQuai: "18",
        orderRef: "HLC-CRF-003",
        rating: 5,
        category: "Tableware",
        image:
          "https://imgs.search.brave.com/05X4qMhGg1Kb5awvwiXn0kxaz6pthwqFP0RFnhbcEII/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLmV0/c3lzdGF0aWMuY29t/LzM0NDkyMDk3L3Iv/aWwvYzM3MTk1Lzc1/MzYxMjU3NjUvaWxf/MzAweDMwMC43NTM2/MTI1NzY1X3E3YTMu/anBn",
        gradientFrom: "#3A4550",
        gradientTo: "#181E24",
        svgAccent: "#8FA3B5",
      },
    ],
  },
];

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

/* ─── Merchant tab bar ───────────────────────────────────── */
function MerchantTabs({
  merchants,
  activeId,
  onSelect,
}: {
  merchants: Merchant[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Select merchant"
      className="flex flex-wrap gap-2 border-b border-green-deep/10 pb-1"
    >
      {merchants.map((m) => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(m.id)}
            className={`relative px-4 py-2 text-sm uppercase tracking-widest transition-colors ${
              active ? "text-green-deep" : "text-green-deep/40 hover:text-green-deep/70"
            }`}
            style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
          >
            {m.name}
            {active && (
              <motion.div
                layoutId="merchant-tab-underline"
                className="absolute left-0 right-0 -bottom-[5px] h-[2px]"
                style={{ background: "#B87333" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
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
      <div>
        <img src={product.image} alt={product.name} className="object-cover w-full aspect-square" />
      </div>
      <div className="flex flex-1 flex-col p-6 gap-3">
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

        <h2
          className="text-xl text-green-deep leading-snug"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
        >
          {product.name}
        </h2>

        <StarRating rating={product.rating} />

        <p
          className="flex-1 text-green-deep/60 leading-relaxed"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.98rem", lineHeight: 1.65 }}
        >
          {product.description}
        </p>

        <div className="h-px bg-gold-line/25 my-1" />

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

  const [activeMerchantId, setActiveMerchantId] = useState(MERCHANTS[0].id);
  const activeMerchant =
    MERCHANTS.find((m) => m.id === activeMerchantId) ?? MERCHANTS[0];

  const wallet = useWallet();
  const walletContext = wallet.isConnected
    ? { provider: wallet.provider, address: wallet.address }
    : undefined;

  const configWarning = getContractConfigWarning();

  return (
    <main className="bg-cream min-h-screen overflow-x-hidden">
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

            {/* Merchant tabs */}
            <motion.div variants={fadeIn}>
              <MerchantTabs
                merchants={MERCHANTS}
                activeId={activeMerchantId}
                onSelect={setActiveMerchantId}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeMerchant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start justify-between flex-wrap gap-6">
                  <div>
                    <h1
                      className="text-4xl md:text-5xl text-green-deep leading-tight"
                      style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
                    >
                      {activeMerchant.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                      <MapPin size={14} className="text-gold-line" />
                      <span
                        className="text-sm text-green-deep/55"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {activeMerchant.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-forge-primary/30 bg-forge-primary/8 px-5 py-2.5">
                    <span className="h-2 w-2 rounded-full bg-forge-primary animate-pulse-dot" />
                    <span
                      className="text-xs uppercase tracking-widest text-forge-primary"
                      style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
                    >
                      Accepts QUAI
                    </span>
                  </div>
                </div>

                <p
                  className="max-w-xl text-green-deep/60 leading-relaxed mt-4"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", lineHeight: 1.75 }}
                >
                  {activeMerchant.tagline} Powered by the embedded{" "}
                  <span className="text-green-deep font-medium">QuaiForge</span>{" "}
                  widget.
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #B87333 30%, #B87333 70%, transparent 100%)", opacity: 0.3 }}
        />
      </div>

      {/* Product grid */}
      <section ref={gridRef} className="mx-auto max-w-6xl px-6 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMerchant.id}
            variants={stagger}
            initial="hidden"
            animate={gridInView ? "visible" : "hidden"}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-10"
          >
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
                {activeMerchant.products.length} items
              </span>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {activeMerchant.products.map((p) => (
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
        </AnimatePresence>
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