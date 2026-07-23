"use client";

import { motion } from "framer-motion";
import { GlowButton } from "./ui/GlowButton";
import { ConnectWalletButton } from "./wallet/ConnectWalletButton";
import { DashboardEntry } from "./dashboard/DashboardEntry";
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
          className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-cyan sm:text-xs"
        >
          MultiversX • Supernova • Quantum Trade
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
          className="mt-4 max-w-xl font-display text-lg font-semibold leading-snug tracking-wide text-foreground sm:text-2xl md:text-3xl"
        >
          Powered by{" "}
          <span className="text-purple text-glow-purple">$NOVA</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-4 max-w-md space-y-3 text-sm leading-relaxed text-muted sm:text-base"
        >
          <p>
            Evolgo is an autonomous AI trading intelligence layer built to learns
            from historical data, evolves its strategies, and adapts to market
            conditions.
          </p>
          <p className="italic">Access and execution are powered by $NOVA.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          id="buy"
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <GlowButton
            variant="cyan"
            className="sm:min-w-[160px]"
            onClick={openBuyModal}
          >
            Buy $NOVA
          </GlowButton>
          <ConnectWalletButton
            variant="ghost"
            className="sm:min-w-[160px]"
          />
          <DashboardEntry compact className="sm:min-w-[140px] justify-center !py-3.5 !text-xs" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted"
        >
          <span>
            Supply <span className="text-green">450M</span>
          </span>
          <span className="text-white/20">|</span>
          <span>
            Chain <span className="text-cyan">MultiversX</span>
          </span>
          <span className="text-white/20">|</span>
          <span>
            Mechanism <span className="text-purple">Buyback & Burn</span>
          </span>
        </motion.div>
      </div>
    </section>
  );
}
