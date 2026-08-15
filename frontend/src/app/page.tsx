"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
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
    },
    {
      title: "How on-chain invoices transform merchant trust",
      meta: "Blockchain Weekly, 2025",
    },
    {
      title: "Building DeFi tools for emerging markets",
      meta: "Web3 Africa, 2024",
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

          {/* 3-column article-style grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gold-line/30">
            {articles.map((a, i) => (
              <motion.article
                key={i}
                variants={fadeUp}
                className="flex flex-col gap-4 px-6 py-8 md:px-8 md:py-0 first:pl-0 last:pr-0"
              >
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
      svgBg: "#2C4870",
    },
    {
      type: "liquidity" as const,
      label: "Liquidity",
      description: "Provide liquidity in concentrated positions and earn fee revenue on every trade.",
      svgBg: "#1B3A2D",
    },
    {
      type: "bridge" as const,
      label: "Bridge",
      description: "Native cross-shard bridging with on-chain receipts and dual confirmation.",
      svgBg: "#8A4A22",
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
                className="flex flex-col items-center gap-4"
              >
                {/* Arch image */}
                <ArchFrame className="w-full max-w-[220px] aspect-[4/5]">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(160deg, ${f.svgBg} 0%, #0a1a12 100%)` }}
                  >
                    <FeatureIllustration type={f.type} />
                  </div>
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
              payments to any website. I am passionate about DeFi infrastructure,
              cross-shard technology, and making blockchain payments accessible
              to everyday merchants in emerging markets.
            </motion.p>

            <motion.p
              variants={fadeIn}
              className="text-lg leading-relaxed text-green-deep/75"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.15rem", lineHeight: "1.75" }}
            >
              My goal is to make QuaiForge the simplest way for any merchant to
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
                {/* Storyset-style person illustration (inline SVG) */}
                <svg viewBox="0 0 300 380" fill="none" className="w-full h-full p-8" role="img" aria-label="Developer working illustration">
                  {/* Body */}
                  <ellipse cx="150" cy="320" rx="70" ry="20" fill="#0a1a12" fillOpacity="0.4" />
                  {/* Legs */}
                  <rect x="125" y="260" width="20" height="70" rx="10" fill="#8B7355" />
                  <rect x="155" y="260" width="20" height="70" rx="10" fill="#8B7355" />
                  {/* Torso */}
                  <rect x="110" y="160" width="80" height="110" rx="20" fill="#E8D5B0" />
                  {/* Arms */}
                  <rect x="75" y="165" width="42" height="18" rx="9" fill="#D4B896" transform="rotate(20 75 165)" />
                  <rect x="185" y="165" width="42" height="18" rx="9" fill="#D4B896" transform="rotate(-20 185 165)" />
                  {/* Laptop */}
                  <rect x="90" y="210" width="120" height="70" rx="8" fill="#2D2D2D" />
                  <rect x="95" y="215" width="110" height="60" rx="5" fill="#1a1a2e" />
                  {/* Code lines on screen */}
                  <rect x="100" y="222" width="60" height="4" rx="2" fill="#00E676" fillOpacity="0.7" />
                  <rect x="100" y="232" width="80" height="4" rx="2" fill="#B87333" fillOpacity="0.7" />
                  <rect x="100" y="242" width="50" height="4" rx="2" fill="#00E676" fillOpacity="0.5" />
                  <rect x="100" y="252" width="70" height="4" rx="2" fill="#F5F0E8" fillOpacity="0.3" />
                  {/* Head */}
                  <circle cx="150" cy="130" r="42" fill="#D4B896" />
                  {/* Hair */}
                  <ellipse cx="150" cy="95" rx="42" ry="20" fill="#2D1B0E" />
                  {/* Eyes */}
                  <ellipse cx="138" cy="128" rx="5" ry="6" fill="#2D1B0E" />
                  <ellipse cx="162" cy="128" rx="5" ry="6" fill="#2D1B0E" />
                  <circle cx="139" cy="127" r="2" fill="white" />
                  <circle cx="163" cy="127" r="2" fill="white" />
                  {/* Smile */}
                  <path d="M140 143 Q150 152 160 143" stroke="#2D1B0E" strokeWidth="2" fill="none" strokeLinecap="round" />
                  {/* Floating QUAI badge */}
                  <rect x="20" y="40" width="80" height="36" rx="12" fill="#F5F0E8" />
                  <text x="29" y="55" fontSize="9" fill="#1B3A2D" fontFamily="monospace" fontWeight="bold">QUAI</text>
                  <text x="29" y="69" fontSize="8" fill="#B87333" fontFamily="monospace">+ 45.00</text>
                  {/* Floating check badge */}
                  <rect x="200" y="60" width="80" height="36" rx="12" fill="#00E676" fillOpacity="0.9" />
                  <text x="210" y="75" fontSize="9" fill="#060F0F" fontFamily="monospace" fontWeight="bold">Confirmed</text>
                  <text x="215" y="88" fontSize="8" fill="#060F0F" fontFamily="monospace">on-chain ✓</text>
                </svg>
              </div>
            </ArchFrame>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Background / Stats ───────────────────────────────────── */
function BackgroundSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  const items = [
    {
      icon: GraduationCap,
      label: "Buildathon Origin",
      sublabel: "QUAI × BLIP",
      detail: "Jos, Nigeria — 2025",
    },
    {
      icon: Building2,
      label: "Quai Network",
      sublabel: "Orchard Testnet",
      detail: "January – Present 2025",
    },
    {
      icon: Settings,
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
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  {/* Icon in a circle — matches Figma warm-brown circles */}
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-brown shadow-[0_4px_16px_rgba(139,69,19,0.25)]">
                    <Icon size={32} strokeWidth={1.5} className="text-cream" />
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
      quote: "Add your own one-liner testimonial",
      body: "Boost your product and service's credibility by adding testimonials from your clients. People love recommendations so feedback from others who've tried it is invaluable.",
      author: "Name",
      role: "Industry or Job Title",
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
