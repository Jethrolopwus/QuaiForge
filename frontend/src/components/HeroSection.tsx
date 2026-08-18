"use client";

import { useRouter } from "next/navigation";
import { motion,Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";

/* ─── Animation variants (mirrors page.tsx) ─────────────── */
const fadeUp:Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants  = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.06 },
  },
};

const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};


const ORBIT_NODES = [
  { label: "QUAI", color: "#1B3A2D", textColor: "#F5F0E8", angle: 270, radius: 122, fontSize: 9 },
  { label: "ETH", color: "#2D5A40", textColor: "#F5F0E8", angle: 330, radius: 122, fontSize: 9 },
  { label: "BTC", color: "#2D5A40", textColor: "#F5F0E8", angle: 30, radius: 122, fontSize: 9 },
  { label: "USDT", color: "#1B3A2D", textColor: "#F5F0E8", angle: 90, radius: 122, fontSize: 8 },
  { label: "BNB", color: "#2D5A40", textColor: "#F5F0E8", angle: 150, radius: 122, fontSize: 9 },
  { label: "SOL", color: "#B87333", textColor: "#F5F0E8", angle: 210, radius: 122, fontSize: 9 },
];


/* ─── Inline SVG illustration ────────────────────────────── */
function IllustrationHero() {
  const cx = 190; // center x of viewBox
  const cy = 190; // center y of viewBox

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Orbit ring track */}
      <svg
        viewBox="0 0 380 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        {/* Dashed orbit track */}
        <circle
          cx={cx}
          cy={cy}
          r={122}
          stroke="#1B3A2D"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="5 4"
        />
        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r={155} stroke="#B87333" strokeOpacity="0.07" strokeWidth="1" />
        {/* Inner fill rings */}
        <circle cx={cx} cy={cy} r={58} fill="#1B3A2D" fillOpacity="0.08" />
        {/* Central Q node */}
        <circle cx={cx} cy={cy} r={46} fill="#1B3A2D" />
        <circle cx={cx} cy={cy} r={36} fill="#2D5A40" />
        <text
          x={cx - 9}
          y={cy + 11}
          fontSize="28"
          fontWeight="700"
          fill="#F5F0E8"
          fontFamily="Georgia, serif"
        >
          Q
        </text>
        {/* Exchange arrows — below the Q text, clear of the letter */}
        <path d="M179 208 L201 208 M201 208 L195 202 M201 208 L195 214" stroke="#00E676" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M201 218 L179 218 M179 218 L185 212 M179 218 L185 224" stroke="#B87333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Orbiting satellite group — rotates the whole ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "center center" }}
      >
        {ORBIT_NODES.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          // position as % of container — SVG viewBox is 380×380
          const left = `${((cx + node.radius * Math.cos(rad)) / 380) * 100}%`;
          const top = `${((cy + node.radius * Math.sin(rad)) / 380) * 100}%`;
          return (
            <div
              key={node.label}
              className="absolute flex items-center justify-center rounded-full shadow-lg"
              style={{
                width: 44,
                height: 44,
                background: node.color,
                left,
                top,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Counter-rotate the label so text stays upright */}
              <motion.span
                className="text-[9px] font-mono font-bold leading-none"
                style={{ color: node.textColor }}
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                {node.label}
              </motion.span>
            </div>
          );
        })}
      </motion.div>

      {/* Subtle pulsing glow behind center */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 110,
          height: 110,
          background: "radial-gradient(circle, #2D5A4044 0%, transparent 70%)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
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
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center center" }}
            >
              {/* Live TX badge — top-right quadrant (angle -45°) */}
              <div
                className="absolute"
                style={{
                  left: "79%",
                  top: "21%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                  className="rounded-2xl border border-green-deep/20 bg-cream shadow-card px-3 py-2 whitespace-nowrap"
                >
                  <p className="text-[10px] uppercase tracking-wider text-green-deep/60" style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}>Live TX</p>
                  <p className="text-sm font-semibold text-green-deep" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>45 QUAI</p>
                </motion.div>
              </div>

              {/* Confirmed badge — bottom-left quadrant (angle 135°) */}
              <div
                className="absolute"
                style={{
                  left: "21%",
                  top: "79%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                  className="rounded-2xl border border-forge-primary/30 bg-cream shadow-card px-3 py-2 whitespace-nowrap"
                >
                  <p className="text-[10px] uppercase tracking-wider text-warm-brown" style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}>Confirmed ✓</p>
                  <p className="text-[10px] text-green-deep/60">On-chain record</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
