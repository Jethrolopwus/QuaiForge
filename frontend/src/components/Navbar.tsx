"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Menu, X, Wallet, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { WalletModal } from "@/components/WalletModal";

const NAV_LINKS = [
  { label: "Home",        href: "#home" },
  { label: "Features",   href: "#features" },
  { label: "Focuses",    href: "#focuses" },
  { label: "About",      href: "#about" },
  { label: "Background", href: "#background" },
  { label: "Testimonial",href: "#testimonial" },
];

/** Smooth-scrolls to the element with the given id, accounting for the fixed navbar height. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navbarHeight = 72; // matches py-4/py-3 + logo height
  const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

const navbarVariants : Variants = {
  hidden: { y: -80, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const mobileMenuVariants : Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2 },
  },
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // ── Wallet state ──────────────────────────────────────────────────────────
  const wallet = useWallet();

  // Auto-close the modal the moment the wallet status becomes connected.
  // Covers silent session restore and external accountsChanged events.
  useEffect(() => {
    if (wallet.status === "connected") {
      setWalletModalOpen(false);
    }
  }, [wallet.status]);

  // Wraps wallet.connect() so the modal closes the instant the Pelagus/Blip
  // popup is approved. connect() only resolves after quai_requestAccounts
  // returns successfully, so this is the earliest possible moment.
  const handleConnect = async () => {
    await wallet.connect();
    setWalletModalOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    const id = href.replace("#", "");
    scrollToSection(id);
    setMobileOpen(false);
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: "'Cormorant SC', Georgia, serif",
    letterSpacing: "0.08em",
    fontSize: "0.9rem",
  };

  // ── Button appearance ─────────────────────────────────────────────────────
  // Connected  → filled green pill showing truncated address + check icon
  // Connecting → filled pill with "Connecting…" (dimmed, non-interactive)
  // Error      → filled pill with red tint, label "Wallet error"
  // Idle       → filled green pill "Connect Wallet"

  const buttonLabel =
    wallet.status === "connected" && wallet.shortAddress
      ? wallet.shortAddress
      : wallet.status === "connecting"
      ? "Connecting…"
      : wallet.status === "error"
      ? "Wallet error"
      : "Connect Wallet";

  const buttonIcon =
    wallet.status === "connected" ? (
      <CheckCircle2 size={14} strokeWidth={2.5} />
    ) : (
      <Wallet size={15} strokeWidth={2.2} />
    );

  const buttonClass =
    wallet.status === "connected"
      ? "flex items-center gap-2 rounded-full border border-green-deep/30 bg-green-deep/10 px-5 py-2.5 text-sm font-semibold text-green-deep shadow-sm transition-all hover:bg-green-deep/20 focus:outline-none focus:ring-2 focus:ring-green-deep focus:ring-offset-2 focus:ring-offset-cream"
      : wallet.status === "error"
      ? "flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-cream"
      : "flex items-center gap-2 rounded-full bg-green-deep px-5 py-2.5 text-sm font-semibold text-cream shadow-card transition-all hover:bg-green-mid focus:outline-none focus:ring-2 focus:ring-green-deep focus:ring-offset-2 focus:ring-offset-cream";

  // Mobile button classes mirror desktop but full-width
  const mobileButtonClass =
    wallet.status === "connected"
      ? "flex w-full items-center justify-center gap-2 rounded-full border border-green-deep/30 bg-green-deep/10 px-5 py-3 text-sm font-semibold text-green-deep"
      : wallet.status === "error"
      ? "flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white"
      : "flex w-full items-center justify-center gap-2 rounded-full bg-green-deep px-5 py-3 text-sm font-semibold text-cream";

  const handleWalletButtonClick = () => {
    setMobileOpen(false);
    setWalletModalOpen(true);
  };

  return (
    <>
      <motion.header
        variants={navbarVariants}
        initial="hidden"
        animate="visible"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-cream/95 backdrop-blur-md shadow-[0_2px_20px_rgba(27,58,45,0.1)] border-b border-gold-line/20"
            : "bg-cream/80 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:py-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="QuaiForge home"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="relative h-9 w-9 shrink-0"
            >
              <Image
                src="/quaiforge-mark.png"
                alt="QuaiForge"
                fill
                sizes="36px"
                className="rounded-full object-cover shadow-sm"
                priority
              />
            </motion.div>
            <span
              className="font-dm-serif text-xl font-normal text-green-deep tracking-tight"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Quai<span className="text-warm-brown">Forge</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="px-3 py-2 rounded-md text-green-deep hover:text-green-mid hover:bg-cream-dark transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-deep"
                style={linkStyle}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA — wallet button */}
          <div className="hidden lg:flex items-center gap-3">
            <motion.button
              whileHover={{ scale: wallet.status === "connecting" ? 1 : 1.03 }}
              whileTap={{ scale: wallet.status === "connecting" ? 1 : 0.97 }}
              disabled={wallet.status === "connecting"}
              onClick={handleWalletButtonClick}
              className={buttonClass}
              style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
              aria-label={
                wallet.isConnected
                  ? `Wallet connected: ${wallet.address ?? ""}`
                  : "Connect wallet"
              }
            >
              {buttonIcon}
              {buttonLabel}
              {/* Wrong-chain amber dot badge */}
              {wallet.isWrongChain && (
                <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-500" aria-label="Wrong network" />
              )}
            </motion.button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden rounded-md p-2 text-green-deep hover:bg-cream-dark focus:outline-none focus:ring-2 focus:ring-green-deep"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              key="mobile-menu"
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden border-t border-gold-line/20 bg-cream/98 backdrop-blur-md lg:hidden"
              aria-label="Mobile navigation"
            >
              <div className="px-6 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="block w-full text-left py-2.5 px-2 text-green-deep hover:text-green-mid border-b border-gold-line/15 last:border-0 focus:outline-none"
                    style={{
                      fontFamily: "'Cormorant SC', Georgia, serif",
                      letterSpacing: "0.08em",
                      fontSize: "1rem",
                    }}
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-4">
                  <button
                    disabled={wallet.status === "connecting"}
                    onClick={handleWalletButtonClick}
                    className={mobileButtonClass}
                    style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
                  >
                    {buttonIcon}
                    {buttonLabel}
                    {wallet.isWrongChain && (
                      <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Wallet modal — rendered outside the header so it sits above everything */}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        status={wallet.status}
        kind={wallet.kind}
        isBlip={wallet.isBlip}
        hasPelagus={wallet.hasPelagus}
        address={wallet.address}
        shortAddress={wallet.shortAddress}
        chainId={wallet.chainId}
        isWrongChain={wallet.isWrongChain}
        error={wallet.error}
        onConnect={handleConnect}
        onDisconnect={wallet.disconnect}
        onSwitchChain={wallet.switchChain}
      />
    </>
  );
}
