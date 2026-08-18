"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Globe,
  TrendingUp,
  Users,
  Award,
  GraduationCap,
  Building2,
  Settings,
} from "lucide-react";
import { Footer } from "@/components/Footer";

/* ─── Shared animation variants ──────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants = {
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

/* ─── Section heading component (matches Figma exactly) ─── */
function SectionTitle({
  children,
  className = "",
  color = "text-green-deep",
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center">
      <h2
        className={`title-underline heading-display text-5xl md:text-6xl ${color} ${className}`}
        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
      >
        {children}
      </h2>
    </motion.div>
  );
}

/* ─── Gold divider line ─────────────────────────────────── */
function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <motion.span
      variants={fadeIn}
      className={`gold-divider ${className}`}
      style={{ background: "#B87333" }}
    />
  );
}


/* ─── Stats illustration (storyset-style) ─────────────── */
function IllustrationStats() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
      <rect x="20" y="80" width="28" height="80" rx="4" fill="#1B3A2D" fillOpacity="0.15" />
      <rect x="60" y="50" width="28" height="110" rx="4" fill="#1B3A2D" fillOpacity="0.25" />
      <rect x="100" y="30" width="28" height="130" rx="4" fill="#1B3A2D" fillOpacity="0.4" />
      <rect x="140" y="10" width="28" height="150" rx="4" fill="#1B3A2D" />
      <path d="M20 75 Q60 40 100 25 Q140 10 180 5" stroke="#B87333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Feature card illustration ─────────────────────────── */
function FeatureIllustration({ type }: { type: "swap" | "liquidity" | "bridge" }) {
  if (type === "swap") {
    return (
      <svg viewBox="0 0 80 80" fill="none" className="w-12 h-12">
        <circle cx="40" cy="40" r="36" fill="#1B3A2D" fillOpacity="0.1" />
        <path d="M25 32 L55 32 M55 32 L47 24 M55 32 L47 40" stroke="#1B3A2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 48 L25 48 M25 48 L33 40 M25 48 L33 56" stroke="#B87333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "liquidity") {
    return (
      <svg viewBox="0 0 80 80" fill="none" className="w-12 h-12">
        <circle cx="40" cy="40" r="36" fill="#1B3A2D" fillOpacity="0.1" />
        <circle cx="40" cy="40" r="18" stroke="#1B3A2D" strokeWidth="2" fill="none" />
        <path d="M40 22 L40 40 L52 52" stroke="#B87333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="40" r="4" fill="#1B3A2D" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-12 h-12">
      <circle cx="40" cy="40" r="36" fill="#1B3A2D" fillOpacity="0.1" />
      <rect x="22" y="32" width="36" height="24" rx="4" stroke="#1B3A2D" strokeWidth="2" fill="none" />
      <path d="M28 32 L28 26 Q28 22 32 22 L48 22 Q52 22 52 26 L52 32" stroke="#B87333" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="44" r="5" fill="#1B3A2D" />
    </svg>
  );
}

/* ─── Arch image frame ───────────────────────────────────── */
function ArchFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ borderRadius: "50% 50% 0 0 / 40% 40% 0 0" }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ══════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <main className="overflow-x-hidden bg-cream">
      {/* ── HERO ────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── FEATURES ────────────────────────────────────────── */}
      <FeaturesSection />

      {/* ── DESIGN FOCUSES / HOW IT WORKS ───────────────────── */}
      <HowItWorksSection />

      {/* ── ABOUT QUAIFORGE ─────────────────────────────────── */}
      <AboutSection />

      {/* ── BACKGROUND / STATS ──────────────────────────────── */}
      <BackgroundSection />

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <Footer />
    </main>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  SECTIONS                                                   */
/* ══════════════════════════════════════════════════════════ */


/* ── Features ─────────────────────────────────────────────── */
function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const articles = [
    {
      title: "Instant Quai Swaps — fast and non-custodial",
      meta: "QuaiForge Protocol, 2025",
      img: "/feature-swap.png",
      alt: "Person swapping crypto coins on a phone",
    },
    {
      title: "How on-chain invoices transform merchant trust",
      meta: "Blockchain Weekly, 2025",
      img: "/feature-invoice.png",
      alt: "Merchant receiving a blockchain invoice on a tablet",
    },
    {
      title: "Building DeFi tools for emerging markets",
      meta: "Web3 Africa, 2024",
      img: "/feature-defi.png",
      alt: "People using crypto payments at an African market",
    },
  ];

  return (
    <section id="features" ref={ref} className="bg-cream section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex flex-col items-center gap-16"
        >
          {/* Title */}
          <SectionTitle>Features</SectionTitle>

          {/* Subtext description */}
          <motion.p
            variants={fadeIn}
            className="max-w-2xl text-center text-green-deep/70 text-lg -mt-8 mb-4 leading-relaxed"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.2rem" }}
          >
            QuaiForge combines the instantaneous nature of off-chain payment verification with the absolute finality of the Quai Network blockchain. Accept multi-currency settlement via Blip seamlessly.
          </motion.p>

          {/* 3-column article-style grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-gold-line/30">
            {articles.map((a, i) => (
              <motion.article
                key={i}
                variants={fadeUp}
                className="flex flex-col items-center gap-5 px-6 py-8 md:px-8 md:py-0 first:pl-0 last:pr-0 group"
              >
                {/* Illustration */}
                <div className="w-full overflow-hidden rounded-2xl border border-green-deep/8 shadow-card bg-cream-dark">
                  <Image
                    src={a.img}
                    alt={a.alt}
                    width={400}
                    height={320}
                    className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <h3
                  className="text-2xl text-green-deep leading-snug text-center italic"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500, fontSize: "1.45rem" }}
                >
                  {a.title}
                </h3>
                <GoldDivider />
                <p
                  className="text-center text-green-deep/55 mt-1"
                  style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.1em", fontSize: "0.82rem" }}
                >
                  {a.meta}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── How It Works / Design Focuses (with arch images) ─────── */
function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const focuses = [
    {
      type: "swap" as const,
      label: "Swap",
      description: "Token-to-token swaps with best-route aggregation across Quai Network shards.",
      img: "/focus-swap.png",
      alt: "Fast token swap illustration",
    },
    {
      type: "liquidity" as const,
      label: "Liquidity",
      description: "Provide liquidity in concentrated positions and earn fee revenue on every trade.",
      img: "/focus-liquidity.png",
      alt: "Liquidity provider investment illustration",
    },
    {
      type: "bridge" as const,
      label: "Bridge",
      description: "Native cross-shard bridging with on-chain receipts and dual confirmation.",
      img: "/focus-bridge.png",
      alt: "Cross-shard network bridge illustration",
    },
  ];

  return (
    <section id="focuses" ref={ref} className="bg-cream-dark section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex flex-col items-center gap-16"
        >
          {/* Title matches Figma "Design Focuses" style */}
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-1">
            <h2
              className="text-5xl md:text-6xl text-warm-brown text-center"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
            >
              Protocol Focuses
            </h2>
            {/* Squiggly underline decoration — SVG */}
            <svg width="120" height="20" viewBox="0 0 120 20" fill="none" className="mt-1">
              <path d="M4 10 Q20 4 36 10 Q52 16 68 10 Q84 4 100 10 Q112 14 116 12" stroke="#B87333" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* 3 arch-image cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-10">
            {focuses.map((f, i) => (
              <motion.div
                key={f.label}
                variants={fadeUp}
                className="flex flex-col items-center gap-4 group"
              >
                {/* Arch image */}
                <ArchFrame className="w-full max-w-[220px] aspect-[4/5] overflow-hidden rounded-t-full border border-green-deep/8 shadow-card bg-cream">
                  <Image
                    src={f.img}
                    alt={f.alt}
                    width={220}
                    height={275}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </ArchFrame>

                <h3
                  className="text-2xl text-green-deep text-center mt-2"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
                >
                  {f.label}
                </h3>
                <div className="w-full max-w-[220px] h-px bg-gold-line/40" />
                <p
                  className="text-center text-green-deep/65 text-sm leading-relaxed max-w-[220px]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1rem" }}
                >
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── About ────────────────────────────────────────────────── */
function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const aboutImages = [
    "https://pbs.twimg.com/profile_images/1932754865488355329/6STPvmBO_400x400.jpg",
    "https://pbs.twimg.com/media/HJ-a63SWgAAyxvD?format=jpg&name=large",
    "https://pbs.twimg.com/profile_images/2028447934153707520/z1ryqdKd_400x400.jpg",
  ];

  return (
    <section id="about" ref={ref} className="bg-cream section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <motion.div variants={fadeUp}>
              {/* "About QuaiForge" — italic DM Serif with oval underline accent on "About" */}
              <h2
                className="text-4xl md:text-5xl leading-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
              >
                <span className="relative inline-block">
                  {/* Oval circle decoration (matches Figma) */}
                  <svg
                    className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]"
                    viewBox="0 0 120 52"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <ellipse cx="60" cy="26" rx="58" ry="24" stroke="#8B4513" strokeWidth="1.5" fill="none" />
                  </svg>
                  <em className="relative text-warm-brown">About</em>
                </span>{" "}
                <span className="text-green-deep">QuaiForge</span>
              </h2>
            </motion.div>

            <motion.p
              variants={fadeIn}
              className="text-lg leading-relaxed text-green-deep/75"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.15rem", lineHeight: "1.75" }}
            >
              Built for the QUAI × BLIP Buildathon in Jos, QuaiForge is a
              drop-in merchant checkout widget that brings real, on-chain Quai
              payments to any website. We are passionate about DeFi infrastructure,
              cross-shard technology, and making blockchain payments accessible
              to everyday merchants in emerging markets.
            </motion.p>

            <motion.p
              variants={fadeIn}
              className="text-lg leading-relaxed text-green-deep/75"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.15rem", lineHeight: "1.75" }}
            >
              Our goal is to make QuaiForge the simplest way for any merchant to
              accept crypto — no custodian, no intermediaries, just a single
              button and a wallet-to-wallet transfer recorded on Orchard.
            </motion.p>

            <motion.div variants={fadeIn}>
              <Link
                href="/widget-demo"
                className="inline-flex items-center gap-2 text-green-deep border-b-2 border-gold-line pb-0.5 hover:text-green-mid transition-colors"
                style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.08em" }}
              >
                See the demo <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>

          {/* Right: arch image frame */}
          <motion.div
            variants={fadeUp}
            className="flex justify-center lg:justify-end"
          >
            <ArchFrame className="w-full max-w-[380px] aspect-[3/4]">
              <div
                className="w-full h-full relative flex items-center justify-center"
                style={{ background: "linear-gradient(160deg, #2D5A40 0%, #1B3A2D 100%)" }}
              >
                {/* Three circular merchant photos, offset cluster */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={aboutImages[0]}
                    alt="Merchant photo 1"
                    className="absolute w-40 h-40 rounded-full object-cover border-4 border-cream shadow-xl"
                    style={{ top: "20%", left: "26%", transform: "translate(-50%, -50%)" }}
                  />
                  <img
                    src={aboutImages[1]}
                    alt="Merchant photo 2"
                    className="absolute w-40 h-40 rounded-full object-cover border-4 border-cream shadow-xl"
                    style={{ top: "56%", left: "72%", transform: "translate(-50%, -50%)" }}
                  />
                  <img
                    src={aboutImages[2]}
                    alt="Merchant photo 3"
                    className="absolute w-40 h-40 rounded-full object-cover border-4 border-cream shadow-xl"
                    style={{ top: "86%", left: "18%", transform: "translate(-50%, -50%)" }}
                  />
                </div>
              </div>
            </ArchFrame>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
/* ── Background Illustrations ── */
function BuildathonIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-full h-full max-w-[130px] p-2" role="img" aria-label="Buildathon illustration">
      <circle cx="80" cy="80" r="60" fill="#1B3A2D" fillOpacity="0.06" />
      {/* Laptop base and screen */}
      <rect x="35" y="65" width="90" height="55" rx="4" fill="#1B3A2D" />
      <rect x="40" y="70" width="80" height="45" rx="2" fill="#F5F0E8" />
      <rect x="25" y="115" width="110" height="8" rx="2" fill="#8B4513" />
      {/* Code lines on screen */}
      <rect x="48" y="78" width="40" height="4" rx="2" fill="#1B3A2D" fillOpacity="0.6" />
      <rect x="48" y="86" width="60" height="4" rx="2" fill="#B87333" />
      <rect x="48" y="94" width="30" height="4" rx="2" fill="#00E676" />
      {/* Graduation cap floating */}
      <path d="M80 30 L110 42 L80 54 L50 42 Z" fill="#8B4513" />
      <rect x="74" y="48" width="12" height="10" fill="#1B3A2D" />
      <path d="M102 45 L102 62 C102 65 96 68 90 68" stroke="#B87333" strokeWidth="1.5" fill="none" />
      <circle cx="90" cy="68" r="2.5" fill="#B87333" />
      {/* Sparkles */}
      <circle cx="35" cy="40" r="3" fill="#B87333" />
      <circle cx="125" cy="55" r="2" fill="#1B3A2D" />
      <circle cx="130" cy="100" r="3.5" fill="#B87333" />
    </svg>
  );
}

function QuaiNetworkIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-full h-full max-w-[130px] p-2" role="img" aria-label="Quai Network illustration">
      <circle cx="80" cy="80" r="60" fill="#1B3A2D" fillOpacity="0.06" />
      {/* Shard cubes / connected server nodes */}
      {/* Central Node */}
      <rect x="65" y="65" width="30" height="30" rx="6" fill="#8B4513" />
      <circle cx="80" cy="80" r="6" fill="#F5F0E8" />
      {/* Satellite Nodes */}
      <rect x="30" y="30" width="22" height="22" rx="4" fill="#1B3A2D" />
      <circle cx="41" cy="41" r="3.5" fill="#B87333" />
      <rect x="108" y="30" width="22" height="22" rx="4" fill="#1B3A2D" />
      <circle cx="119" cy="41" r="3.5" fill="#B87333" />
      <rect x="30" y="108" width="22" height="22" rx="4" fill="#1B3A2D" />
      <circle cx="41" cy="119" r="3.5" fill="#B87333" />
      <rect x="108" y="108" width="22" height="22" rx="4" fill="#1B3A2D" />
      <circle cx="119" cy="119" r="3.5" fill="#B87333" />
      {/* Connection paths */}
      <path d="M52 41 L65 70" stroke="#B87333" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M108 41 L95 70" stroke="#B87333" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M52 119 L65 90" stroke="#B87333" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M108 119 L95 90" stroke="#B87333" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M41 52 L41 108" stroke="#1B3A2D" strokeOpacity="0.2" strokeWidth="1" />
      <path d="M119 52 L119 108" stroke="#1B3A2D" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

function OpenSourceIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-full h-full max-w-[130px] p-2" role="img" aria-label="Open Source illustration">
      <circle cx="80" cy="80" r="60" fill="#1B3A2D" fillOpacity="0.06" />
      {/* Folder base */}
      <path d="M30 45 C30 41.7 32.7 39 36 39 L65 39 L78 52 L124 52 C127.3 52 130 54.7 130 58 L130 115 C130 118.3 127.3 121 124 121 L36 121 C32.7 121 30 118.3 30 115 Z" fill="#1B3A2D" />
      {/* Paper coming out */}
      <rect x="44" y="55" width="72" height="56" rx="4" fill="#F5F0E8" />
      {/* Code brackets < > */}
      <path d="M68 76 L58 83 L68 90" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M92 76 L102 83 L92 90" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 73 L76 93" stroke="#B87333" strokeWidth="2.5" strokeLinecap="round" />
      {/* Gear */}
      <circle cx="118" cy="108" r="14" fill="#8B4513" />
      <circle cx="118" cy="108" r="6" fill="#F5F0E8" />
    </svg>
  );
}

/* ── Background / Stats ───────────────────────────────────── */
function BackgroundSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const items = [
    {
      illustration: BuildathonIllustration,
      label: "Buildathon Origin",
      sublabel: "QUAI × BLIP",
      detail: "Jos, Nigeria — 2025",
    },
    {
      illustration: QuaiNetworkIllustration,
      label: "Quai Network",
      sublabel: "Orchard Testnet",
      detail: "January – Present 2025",
    },
    {
      illustration: OpenSourceIllustration,
      label: "Open Source",
      sublabel: "MIT License",
      detail: "GitHub — QuaiForge",
    },
  ];

  return (
    <section id="background" ref={ref} className="bg-cream-dark section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex flex-col items-center gap-16"
        >
          <motion.h2
            variants={fadeUp}
            className="text-5xl md:text-6xl text-warm-brown text-center title-underline"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
          >
            Background
          </motion.h2>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12">
            {items.map((item) => {
              const Illustration = item.illustration;
              return (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  className="flex flex-col items-center gap-4 text-center group"
                >
                  {/* Storyset-style vector illustration container */}
                  <div className="w-full max-w-[180px] aspect-square flex items-center justify-center bg-cream rounded-2xl border border-green-deep/8 shadow-card overflow-hidden transition-transform duration-500 group-hover:scale-105">
                    <Illustration />
                  </div>

                  <h3
                    className="text-2xl text-green-deep leading-tight"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
                  >
                    {item.label}
                  </h3>
                  <div className="w-full max-w-[200px] h-px bg-warm-brown/40" />
                  <div>
                    <p
                      className="text-sm font-semibold text-green-deep"
                      style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.08em" }}
                    >
                      {item.sublabel}
                    </p>
                    <p
                      className="text-sm text-green-deep/55 mt-1"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Testimonials ─────────────────────────────────────────── */
function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const testimonials = [
    {
      quote: "Vibrant and genuinely innovative",
      body: "QuaiForge made it trivial to add QUAI payments to our storefront. The widget dropped in with a single component — no backend changes, no custodian. Absolutely fulfilling.",
      author: "Amaka O.",
      role: "Jos Native Wears, Merchant",
    },
    {
      quote: "A truly inspiring DeFi product",
      body: "The dual-confirmation UX is brilliant — watching both the Blip rail and the on-chain event confirm in real time gave our customers immediate trust. Truly inspiring.",
      author: "Sari Purdue",
      role: "Social Media Influencer",
    },
    {
      quote: "Payments that just work, on-chain",
      body: "We were skeptical about crypto checkout slowing customers down, but QuaiForge's flow is faster than our old card processor. Settlement lands in our wallet the moment the block confirms — no waiting on a payment gateway.",
      author: "Daniel T.",
      role: "Plateau Leatherworks, Merchant",
    },
  ];

  return (
    <section id="testimonial" ref={ref} className="bg-green-deep section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex flex-col items-center gap-16"
        >
          {/* Title on dark green background — cream text */}
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <h2
              className="title-underline text-5xl md:text-6xl text-cream text-center"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
            >
              Client Testimonials
            </h2>
          </motion.div>

          {/* 3-column testimonial grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gold-line/30">
            {testimonials.map((t, i) => (
              <motion.article
                key={i}
                variants={fadeUp}
                className="flex flex-col gap-4 px-6 py-8 md:px-8 md:py-0 first:pl-0 last:pr-0"
              >
                {/* Quote headline */}
                <blockquote
                  className="text-2xl text-cream leading-snug text-center italic"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500, fontSize: "1.4rem" }}
                >
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Gold line */}
                <span
                  className="block w-full h-px mt-2"
                  style={{ background: "#B87333" }}
                />

                {/* Body */}
                <p
                  className="text-cream/70 text-center leading-relaxed text-sm"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.98rem", lineHeight: 1.7 }}
                >
                  {t.body}
                </p>

                {/* Attribution */}
                <p
                  className="text-center text-cream/60 mt-2"
                  style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.1em", fontSize: "0.8rem" }}
                >
                  {t.author}, {t.role}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
