"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlowButton } from "./ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";

export function Hero() {
  const { openBuyModal } = useWalletUI();

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-28 pt-28 sm:justify-center sm:pb-24 sm:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 scanlines" aria-hidden>
        <div className="absolute -left-1/4 top-1/4 h-[50vmax] w-[50vmax] rounded-full bg-purple/20 blur-[100px] animate-pulse-glow" />
        <div className="absolute -right-1/4 bottom-1/4 h-[45vmax] w-[45vmax] rounded-full bg-cyan/15 blur-[90px]" />
        <div className="absolute left-1/2 top-1/2 h-[30vmax] w-[30vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green/10 blur-[80px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void via-void/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-[18%] h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-cyan sm:text-[11px] sm:tracking-[0.28em] md:text-xs md:tracking-[0.35em]"
        >
          MultiversX · Autonomous AI · $NOVA
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(2.75rem,12vw,6.5rem)] font-extrabold leading-[0.92] tracking-tight text-glow-cyan"
        >
          EVOLGO
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-4 max-w-2xl font-display text-lg font-semibold leading-snug tracking-wide text-foreground sm:text-2xl md:text-3xl"
        >
          AI agents that evolve with the market
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base"
        >
          EVOLGO combines autonomous AI agents, strategy backtesting and
          real-time execution intelligence into one command layer — powered by
          $NOVA.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          id="buy"
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Link href="/dashboard/agents" className="sm:min-w-[200px]">
            <GlowButton variant="cyan" fullWidth>
              Explore AI Agents
            </GlowButton>
          </Link>
          <GlowButton
            variant="ghost"
            className="sm:min-w-[160px]"
            onClick={openBuyModal}
          >
            Get $NOVA
          </GlowButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px]"
        >
          <span
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-green shadow-[0_0_10px_rgba(57,255,138,0.75)]"
            aria-hidden
          />
          <span className="text-green">Live</span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span>On MultiversX Mainnet</span>
        </motion.div>
      </div>
    </section>
  );
}
