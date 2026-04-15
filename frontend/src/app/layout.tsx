import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulseTrader+ | AI Trading Agent on X Layer",
  description:
    "Talk to your wallet. Trade in 200ms. Watch it happen live. Powered by X Layer Flashblocks, OnchainOS, and x402.",
  openGraph: {
    title: "PulseTrader+ — Conversational AI Trading Agent",
    description:
      "Swap tokens, run DCA strategies, and access premium analytics — all through natural language on X Layer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseTrader+ | AI Trading Agent on X Layer",
    description:
      "Talk to your wallet. Trade in 200ms. Watch it happen live.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0E1A] text-gray-100 grid-bg ambient-bg">
        {children}
      </body>
    </html>
  );
}
