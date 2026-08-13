import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Original forge tokens — kept for CheckoutModal / PayWithBlipButton */
        forge: {
          primary: "#00E676",
          secondary: "#00C853",
          accent: "#00A551",
          dark: "#0F172A",
          ink: "#060F0F",
          mist: "#9FB3A6",
          line: "rgba(0, 230, 118, 0.18)",
        },
        /* New landing page / Figma-inspired palette */
        cream: "#F5F0E8",         // page background
        "cream-dark": "#EDE8DC",  // subtle surface
        "green-deep": "#1B3A2D",  // dark-green sections (testimonials, footer)
        "green-mid": "#2D5A40",   // mid-green accents
        "green-text": "#1B3A2D",  // primary text on cream bg
        "gold-line": "#B87333",   // decorative gold/bronze divider lines
        "brown-accent": "#8B4513", // brown heading accent (Background section)
        "warm-brown": "#A0522D",  // warm brown for titles
      },
      fontFamily: {
        /* Existing */
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo", "Consolas",
          "Liberation Mono", "monospace",
        ],
        sans: [
          "system-ui", "-apple-system", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "sans-serif",
        ],
        /* New landing page fonts */
        cormorant: ["'Cormorant Garamond'", "Georgia", "serif"],
        "dm-serif": ["'DM Serif Display'", "Georgia", "serif"],
        playfair: ["'Playfair Display'", "Georgia", "serif"],
        "cormorant-sc": ["'Cormorant SC'", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 230, 118, 0.35)",
        "glow-sm": "0 0 12px rgba(0, 230, 118, 0.25)",
        card: "0 4px 24px rgba(27, 58, 45, 0.08)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      borderRadius: {
        arch: "50% 50% 0 0 / 60% 60% 0 0", // arch shape for images
      },
    },
  },
  plugins: [],
};

export default config;
