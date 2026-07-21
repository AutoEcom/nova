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
  title: "NOVA | AI Algorithmic Trading on MultiversX",
  description:
    "Elite AI algorithmic trading powered by the $NOVA utility token on MultiversX. Buyback & burn. Supernova-grade performance.",
  keywords: [
    "NOVA",
    "MultiversX",
    "AI trading",
    "algorithmic trading",
    "Web3",
    "crypto",
  ],
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
