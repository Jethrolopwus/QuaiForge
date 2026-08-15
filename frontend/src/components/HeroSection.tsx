"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";

/* ─── Animation variants (mirrors page.tsx) ─────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.06 },
  },
};

const staggerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

/* ─── Inline SVG illustration ────────────────────────────── */
function IllustrationHero() {
  return (
    <svg
      viewBox="0 0 480 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      role="img"
      aria-label="QuaiForge platform illustration"
    >
      {/* Background circles */}
      <circle cx="240" cy="190" r="160" fill="#1B3A2D" fillOpacity="0.06" />
      <circle cx="240" cy="190" r="110" fill="#1B3A2D" fillOpacity="0.05" />
      {/* Central platform node */}
      <circle cx="240" cy="190" r="48" fill="#1B3A2D" />
      <circle cx="240" cy="190" r="38" fill="#2D5A40" />
      {/* Q logo text */}
      <text x="232" y="200" fontSize="26" fontWeight="700" fill="#F5F0E8" fontFamily="serif">Q</text>
      {/* Connection lines */}
      <line x1="240" y1="142" x2="240" y2="80" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="288" y1="166" x2="340" y2="130" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="288" y1="214" x2="340" y2="250" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="240" y1="238" x2="240" y2="300" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="192" y1="214" x2="140" y2="250" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="192" y1="166" x2="140" y2="130" stroke="#B87333" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Satellite nodes */}
      <circle cx="240" cy="68" r="22" fill="#1B3A2D" />
      <text x="233" y="74" fontSize="11" fill="#F5F0E8" fontFamily="monospace">QUAI</text>
      <circle cx="355" cy="118" r="22" fill="#2D5A40" />
      <text x="349" y="124" fontSize="10" fill="#F5F0E8" fontFamily="monospace">ETH</text>
      <circle cx="355" cy="262" r="22" fill="#2D5A40" />
      <text x="347" y="268" fontSize="10" fill="#F5F0E8" fontFamily="monospace">BTC</text>
      <circle cx="240" cy="312" r="22" fill="#1B3A2D" />
      <text x="233" y="318" fontSize="11" fill="#F5F0E8" fontFamily="monospace">USDT</text>
      <circle cx="125" cy="262" r="22" fill="#2D5A40" />
      <text x="118" y="268" fontSize="10" fill="#F5F0E8" fontFamily="monospace">BNB</text>
      <circle cx="125" cy="118" r="22" fill="#2D5A40" />
      <text x="116" y="124" fontSize="10" fill="#F5F0E8" fontFamily="monospace">SOL</text>
      {/* Floating arrows indicating exchange */}
      <path d="M220 155 L255 155" stroke="#00E676" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arr)" />
      <path d="M255 170 L220 170" stroke="#B87333" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arr2)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="#00E676" />
        </marker>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="#B87333" />
        </marker>
      </defs>
    </svg>
  );
}

/* ─── Hero Section ───────────────────────────────────────── */
export function HeroSection() {
  const router = useRouter();
  const wallet = useWallet();

  function handleOpenDemo() {
    if (wallet.status === "connected") {
      router.push("/widget-demo");
    } else {
      toast.warning("Connect your wallet first", {
        description: "Please connect your wallet to access the Merchant Page.",
        duration: 4000,
      });
    }
  }

  return (
    <section id="home" className="relative min-h-screen bg-cream flex items-center pt-20">
      {/* Subtle decorative circles */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 right-10 h-64 w-64 rounded-full bg-green-deep/4 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-20 left-10 h-48 w-48 rounded-full bg-gold-line/10 blur-2xl"
      />

      <div className="mx-auto max-w-7xl w-full px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left copy */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* Badge */}
          <motion.div variants={fadeIn}>
            
            
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-normal leading-[1.08] tracking-tight text-green-deep sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            The Merchant
            <br />
            <span className="italic" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Checkout for{" "}
            </span>
            <span className="text-warm-brown">Quai</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeIn}
            className="max-w-md text-lg leading-relaxed text-green-deep/70"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.15rem" }}
          >
            One button. No code.{" "}
            <em>Real Quai payments.</em> A drop-in &ldquo;Pay with Blip&rdquo;
            checkout widget any merchant can embed — invoices recorded on-chain,
            payments wallet-to-wallet.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeIn} className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={handleOpenDemo}
              className="group inline-flex items-center gap-2 rounded-full bg-green-deep px-7 py-3.5 font-semibold text-cream shadow-card transition-all hover:bg-green-mid hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-deep"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
            >
              Open Merchants
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="https://orchard.quaiscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-green-deep/30 px-7 py-3.5 text-green-deep transition-all hover:border-green-deep hover:bg-cream-dark focus:outline-none focus:ring-2 focus:ring-green-deep"
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
            >
              Orchard Explorer
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={staggerFast}
            className="grid grid-cols-3 gap-6 pt-8 border-t border-green-deep/12"
          >
            {[
              { value: "$2.4M+", label: "Volume Processed" },
              { value: "12,000+", label: "Transactions" },
              { value: "99.9%", label: "Uptime" },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeIn} className="flex flex-col gap-1">
                <span
                  className="text-3xl font-normal text-green-deep"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {s.value}
                </span>
                <span
                  className="text-xs uppercase tracking-widest text-green-deep/55"
                  style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
                >
                  {s.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right illustration */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="relative w-full max-w-[460px] aspect-square">
            {/* Outer rings */}
            <div className="absolute inset-0 rounded-full border border-green-deep/8 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-gold-line/15" />
            {/* Main illustration */}
            <div className="absolute inset-12 flex items-center justify-center">
              <IllustrationHero />
            </div>
            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 right-6 rounded-2xl border border-green-deep/15 bg-cream shadow-card px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wider text-green-deep/60" style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}>Live TX</p>
              <p className="text-sm font-semibold text-green-deep" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>45 QUAI</p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute bottom-10 left-4 rounded-2xl border border-forge-primary/30 bg-cream shadow-card px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wider text-warm-brown" style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}>Confirmed ✓</p>
              <p className="text-xs text-green-deep/60">On-chain record</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
