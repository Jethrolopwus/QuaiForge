import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuaiForge — Pay with Blip",
  description:
    "No-code merchant checkout widget for Quai Network. One button, wallet-to-wallet QUAI payments via Blip.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
