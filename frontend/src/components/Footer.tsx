"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView,Variants } from "framer-motion";
import { useRef, useState } from "react";
import {
  Github,
  Twitter,
  Send,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const fadeUp : Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger : Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Protocol: [
    { label: "Swap", href: "#swap", external: false },
    { label: "Liquidity", href: "#liquidity", external: false },
    { label: "Bridge", href: "#bridge", external: false },
    { label: "Stats", href: "#stats", external: false },
  ],
  Resources: [
    { label: "Documentation", href: "#", external: true },
    { label: "GitHub", href: "https://github.com/Jethrolopwus/QuaiForge", external: true },
    { label: "Orchard Explorer", href: "https://orchard.quaiscan.io", external: true },
    { label: "Buildathon", href: "#", external: false },
  ],
  Community: [
    { label: "Twitter / X", href: "https://x.com/QuaiForge", external: true },
    { label: "Discord", href: "#", external: true },
    { label: "Telegram", href: "#", external: true },
    { label: "Blog", href: "#", external: false },
  ],
};

export function Footer() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  }

  return (
    <footer ref={ref} className="bg-green-deep text-cream">
      {/* Top wave / divider */}
      <div className="overflow-hidden leading-[0]" aria-hidden>
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12"
          preserveAspectRatio="none"
        >
          <path
            d="M0 48 C240 0 480 48 720 24 C960 0 1200 48 1440 24 L1440 0 L0 0 Z"
            fill="#F5F0E8"
          />
        </svg>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto max-w-7xl px-6 pt-16 pb-10"
      >
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column (wider) */}
          <motion.div variants={fadeUp} className="lg:col-span-2 flex flex-col gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="relative h-10 w-10 shrink-0">
                <Image
                  src="/quaiforge-mark.png"
                  alt="QuaiForge"
                  fill
                  sizes="40px"
                  className="rounded-full object-cover"
                />
              </div>
              <span
                className="text-2xl font-normal text-cream"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Quai<span className="text-warm-brown">Forge</span>
              </span>
            </Link>

            {/* Tagline */}
            <p
              className="max-w-xs text-cream/65 leading-relaxed"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", lineHeight: 1.75 }}
            >
              The simplest way for any merchant to accept Quai Network payments.
              Non-custodial, wallet-to-wallet, on-chain.
            </p>

            {/* Social icons */}
            <div className="flex gap-3 mt-2">
              {[
                { icon: Github, href: "https://github.com/Jethrolopwus/QuaiForge", label: "GitHub" },
                { icon: Twitter, href: "https://x.com/QuaiForge", label: "Twitter" },
                { icon: Send, href: "#telegram", label: "Telegram" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 text-cream/50 transition-all hover:border-cream/40 hover:text-cream focus:outline-none focus:ring-2 focus:ring-forge-primary"
                >
                  <Icon size={16} strokeWidth={1.8} />
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div className="mt-4">
              <p
                className="text-xs uppercase tracking-widest text-cream/50 mb-3"
                style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
              >
                Stay Updated
              </p>
              {subscribed ? (
                <p
                  className="text-forge-primary text-sm"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  ✓ You&rsquo;re subscribed. Thank you!
                </p>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 min-w-0 rounded-full border border-cream/15 bg-cream/8 px-4 py-2.5 text-sm text-cream placeholder:text-cream/30 focus:border-forge-primary/50 focus:outline-none focus:ring-1 focus:ring-forge-primary/50 transition-colors"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm-brown text-forge-ink hover:bg-forge-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2 focus:ring-offset-green-deep"
                  >
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <motion.div key={heading} variants={fadeUp} className="flex flex-col gap-5">
              <h3
                className="text-xs uppercase tracking-[0.15em] text-cream/45"
                style={{ fontFamily: "'Cormorant SC', Georgia, serif" }}
              >
                {heading}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      className="group inline-flex items-center gap-1.5 text-cream/60 hover:text-cream transition-colors focus:outline-none focus:underline"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.98rem" }}
                    >
                      {l.label}
                      {l.external && (
                        <ExternalLink
                          size={11}
                          className="opacity-0 group-hover:opacity-60 transition-opacity"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Gold divider */}
        <motion.div
          variants={fadeUp}
          className="mt-16 mb-8 h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent 0%, #B87333 30%, #B87333 70%, transparent 100%)", opacity: 0.4 }}
        />

        {/* Bottom bar */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 text-cream/35"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.88rem" }}
        >
          <p>
            &copy; {new Date().getFullYear()} QuaiForge. Built for QUAI × BLIP Buildathon Jos.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-cream/60 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-cream/60 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-cream/60 transition-colors">Contact</Link>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
