import type { Metadata, Viewport } from "next";
import { Orbitron, Sora, JetBrains_Mono } from "next/font/google";
import { MultiversXProvider } from "@/providers/MultiversXProvider";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "EVOLGO — Autonomous AI Trading Intelligence powered by $NOVA",
  description:
    "EVOLGO is an autonomous AI trading intelligence engine powered by $NOVA on MultiversX. Strategies that evolve with the market.",
  applicationName: "EVOLGO",
  keywords: [
    "EVOLGO",
    "NOVA",
    "$NOVA",
    "MultiversX",
    "AI trading",
    "autonomous trading",
    "algorithmic trading",
    "Web3",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/evolgo-icon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "EVOLGO",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "EVOLGO — Autonomous AI Trading Intelligence powered by $NOVA",
    description:
      "EVOLGO is an autonomous AI trading intelligence engine that learns, evolves, and adapts — powered by $NOVA on MultiversX.",
    type: "website",
    siteName: "EVOLGO",
    images: [{ url: "/evolgo-icon.png", width: 512, height: 512, alt: "EVOLGO" }],
  },
  twitter: {
    card: "summary",
    title: "EVOLGO — Autonomous AI Trading Intelligence powered by $NOVA",
    description:
      "EVOLGO is an autonomous AI trading intelligence engine that learns, evolves, and adapts — powered by $NOVA on MultiversX.",
    images: ["/evolgo-icon.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${sora.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="cyber-bg flex min-h-full flex-col font-sans text-foreground">
        <MultiversXProvider>{children}</MultiversXProvider>
      </body>
    </html>
  );
}
