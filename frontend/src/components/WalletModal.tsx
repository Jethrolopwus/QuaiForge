"use client";

/**
 * WalletModal — wallet connection popup
 *
 * Renders one of four panels depending on wallet state:
 *
 *  "none"       → no wallet detected: offer Blip deep link + Pelagus install
 *  "connecting" → spinner while quai_requestAccounts is in flight
 *  "connected"  → address, chain badge, disconnect, wrong-chain warning
 *  "error"      → error message + retry
 *
 * The modal is purely presentational; all state lives in useWallet (passed in
 * as props so the same hook instance owned by Navbar drives both the button
 * label and the modal content).
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { buildOpenInBlipLink } from "@/lib/blipDeepLinks";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  status: "idle" | "connecting" | "connected" | "error";
  kind: "blip" | "pelagus" | "other" | null;
  isBlip: boolean;
  hasPelagus: boolean;
  address: string | null;
  shortAddress: string | null;
  chainId: string | null;
  isWrongChain: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchChain: () => void;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.97,
    transition: { duration: 0.18 },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Blip flame/star glyph */
function BlipIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2L14.7 9.3L22 12L14.7 14.7L12 22L9.3 14.7L2 12L9.3 9.3L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Pelagus "P" wordmark placeholder */
function PelagusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect width="24" height="24" rx="6" fill="#3B5BDB" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="white"
        fontFamily="sans-serif"
      >
        P
      </text>
    </svg>
  );
}

/** Chain badge: green when correct chain, amber when wrong */
function ChainBadge({
  chainId,
  isWrong,
}: {
  chainId: string | null;
  isWrong: boolean;
}) {
  const label =
    chainId === "0x9"
      ? "Cyprus-1 · Orchard"
      : chainId
      ? `Chain ${chainId}`
      : "Unknown chain";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium ${
        isWrong
          ? "bg-amber-100 text-amber-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isWrong ? "bg-amber-500" : "bg-green-500"
        }`}
      />
      {label}
    </span>
  );
}

// ─── Panel: no wallet detected ────────────────────────────────────────────────

function NoWalletPanel({ onClose }: { onClose: () => void }) {
  // Build the deep link against the current page URL (safe: runs client-side only)
  const blipLink =
    typeof window !== "undefined"
      ? buildOpenInBlipLink(window.location.href)
      : "https://blippay.me/browser?url=https%3A%2F%2Fquaiforge.app";

  const pelagusLink =
    "https://chromewebstore.google.com/detail/pelagus/nhccebmfjcbhghphpclcfdkkekheegop";

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 leading-relaxed">
        No Quai wallet found. Use Blip on mobile or install the Pelagus
        extension on desktop.
      </p>

      {/* Blip option */}
      <a
        href={blipLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-3 w-full rounded-xl border border-gold-line/30 bg-cream-dark px-4 py-3.5 transition hover:border-green-deep/40 hover:bg-cream focus:outline-none focus:ring-2 focus:ring-green-deep group"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-deep text-cream">
          <BlipIcon size={18} />
        </span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-green-deep group-hover:text-green-mid">
            Open in Blip
          </p>
          <p className="text-xs text-neutral-500">Mobile · iOS &amp; Android</p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-neutral-400"
          aria-hidden
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      {/* Pelagus option */}
      <a
        href={pelagusLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-3 w-full rounded-xl border border-gold-line/30 bg-cream-dark px-4 py-3.5 transition hover:border-green-deep/40 hover:bg-cream focus:outline-none focus:ring-2 focus:ring-green-deep group"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden">
          <PelagusIcon size={36} />
        </span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-green-deep group-hover:text-green-mid">
            Install Pelagus
          </p>
          <p className="text-xs text-neutral-500">
            Browser extension · Chrome, Brave, Edge
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-neutral-400"
          aria-hidden
        >
          <path
            d="M6 3L11 8L6 13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}

// ─── Panel: connecting spinner ────────────────────────────────────────────────

function ConnectingPanel({ kind }: { kind: "blip" | "pelagus" | "other" | null }) {
  const label =
    kind === "blip"
      ? "Approve in Blip…"
      : kind === "pelagus"
      ? "Approve in Pelagus…"
      : "Waiting for approval…";

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Loader2 size={32} className="animate-spin text-green-deep" />
      <p className="text-sm font-medium text-green-deep">{label}</p>
      <p className="text-xs text-neutral-400 text-center">
        Check your wallet — a connection request is waiting
      </p>
    </div>
  );
}

// ─── Panel: connected ─────────────────────────────────────────────────────────

function ConnectedPanel({
  kind,
  address,
  shortAddress,
  chainId,
  isWrongChain,
  onDisconnect,
  onSwitchChain,
}: {
  kind: "blip" | "pelagus" | "other" | null;
  address: string | null;
  shortAddress: string | null;
  chainId: string | null;
  isWrongChain: boolean;
  onDisconnect: () => void;
  onSwitchChain: () => void;
}) {
  const walletLabel =
    kind === "blip" ? "Blip" : kind === "pelagus" ? "Pelagus" : "Wallet";

  return (
    <div className="space-y-4">
      {/* Wallet + address row */}
      <div className="flex items-center gap-3 rounded-xl border border-gold-line/30 bg-cream-dark px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-deep/10 text-green-deep">
          {kind === "blip" ? (
            <BlipIcon size={18} />
          ) : kind === "pelagus" ? (
            <PelagusIcon size={36} />
          ) : (
            <Wallet size={18} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-green-deep">{walletLabel}</p>
            <CheckCircle2 size={13} className="text-green-500 shrink-0" />
          </div>
          <p
            className="font-mono text-xs text-neutral-500 truncate"
            title={address ?? ""}
          >
            {shortAddress}
          </p>
        </div>
        <ChainBadge chainId={chainId} isWrong={isWrongChain} />
      </div>

      {/* Wrong chain warning */}
      {isWrongChain && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800">
                Wrong network
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                QuaiForge runs on Cyprus-1. Switch to continue.
              </p>
            </div>
          </div>
          <button
            onClick={onSwitchChain}
            className="mt-2.5 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Switch to Cyprus-1
          </button>
        </div>
      )}

      {/* Disconnect */}
      <button
        onClick={onDisconnect}
        className="w-full rounded-xl border border-gold-line/30 py-2.5 text-sm font-medium text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        Disconnect
      </button>
    </div>
  );
}

// ─── Panel: idle (wallet detected but not yet connected) ──────────────────────

function IdlePanel({
  kind,
  isBlip,
  onConnect,
}: {
  kind: "blip" | "pelagus" | "other" | null;
  isBlip: boolean;
  onConnect: () => void;
}) {
  const walletLabel =
    kind === "blip"
      ? "Blip"
      : kind === "pelagus"
      ? "Pelagus"
      : "Quai Wallet";

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 leading-relaxed">
        {isBlip
          ? "You're inside Blip. Connect your app wallet to continue."
          : `${walletLabel} detected. Connect to interact with QuaiForge.`}
      </p>

      <div className="flex items-center gap-3 rounded-xl border border-gold-line/30 bg-cream-dark px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-deep/10 text-green-deep">
          {kind === "blip" ? (
            <BlipIcon size={18} />
          ) : kind === "pelagus" ? (
            <PelagusIcon size={36} />
          ) : (
            <Wallet size={18} />
          )}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-deep">{walletLabel}</p>
          <p className="text-xs text-neutral-500">Not connected</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConnect}
        className="w-full rounded-xl bg-green-deep py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-green-mid focus:outline-none focus:ring-2 focus:ring-green-deep focus:ring-offset-2"
        style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
      >
        Connect {walletLabel}
      </motion.button>
    </div>
  );
}

// ─── Panel: error ─────────────────────────────────────────────────────────────

function ErrorPanel({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-mono font-medium uppercase tracking-wider text-red-500 mb-1">
          Connection failed
        </p>
        <p className="text-sm text-red-700">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="w-full rounded-xl bg-green-deep py-3 text-sm font-semibold text-cream transition hover:bg-green-mid focus:outline-none focus:ring-2 focus:ring-green-deep"
        style={{ fontFamily: "'Cormorant SC', Georgia, serif", letterSpacing: "0.06em" }}
      >
        Try again
      </button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function WalletModal({
  open,
  onClose,
  status,
  kind,
  isBlip,
  hasPelagus,
  address,
  shortAddress,
  chainId,
  isWrongChain,
  error,
  onConnect,
  onDisconnect,
  onSwitchChain,
}: WalletModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "connecting") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, status]);

  const noWallet = !isBlip && !hasPelagus && kind === null;
  const busy = status === "connecting";

  const title =
    status === "connected"
      ? "Wallet connected"
      : status === "connecting"
      ? "Connecting…"
      : "Connect wallet";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="wallet-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Wallet connection"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            key="wallet-modal-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-sm rounded-2xl border border-gold-line/20 bg-cream shadow-[0_8px_40px_rgba(27,58,45,0.18)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gold-line/15 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-green-deep" strokeWidth={2.2} />
                <span
                  className="text-sm font-semibold text-green-deep"
                  style={{
                    fontFamily: "'Cormorant SC', Georgia, serif",
                    letterSpacing: "0.06em",
                  }}
                >
                  {title}
                </span>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                aria-label="Close wallet modal"
                className="rounded p-1 text-neutral-400 hover:text-green-deep transition focus:outline-none focus:ring-2 focus:ring-green-deep disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {status === "connecting" ? (
                <ConnectingPanel kind={kind} />
              ) : status === "connected" ? (
                <ConnectedPanel
                  kind={kind}
                  address={address}
                  shortAddress={shortAddress}
                  chainId={chainId}
                  isWrongChain={isWrongChain}
                  onDisconnect={() => {
                    onDisconnect();
                    onClose();
                  }}
                  onSwitchChain={onSwitchChain}
                />
              ) : status === "error" ? (
                <ErrorPanel error={error ?? "Unknown error"} onRetry={onConnect} />
              ) : noWallet ? (
                <NoWalletPanel onClose={onClose} />
              ) : (
                <IdlePanel kind={kind} isBlip={isBlip} onConnect={onConnect} />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gold-line/15 px-5 py-3 text-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Self-custody · Quai Network · Cyprus-1
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
