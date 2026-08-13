import type { Config } from "tailwindcss";

/**
 * QuaiForge brand tokens — from the official brand palette:
 *   Primary   #00E676   (bright signal green — CTAs, live states)
 *   Secondary #00C853   (button green, hover states)
 *   Accent    #00A551   (deep green — borders, quiet accents)
 *   Dark Gray #0F172A   (surface panels)
 *   Ink       #060F0F   (page background, near-black)
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          primary: "#00E676",
          secondary: "#00C853",
          accent: "#00A551",
          dark: "#0F172A",
          ink: "#060F0F",
          mist: "#9FB3A6",
          line: "rgba(0, 230, 118, 0.18)",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 230, 118, 0.35)",
        "glow-sm": "0 0 12px rgba(0, 230, 118, 0.25)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
