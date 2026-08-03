"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";
import {
  SUPPLY_ALLOCATIONS,
  TOKENOMICS_STAKING_TIERS,
  TOTAL_SUPPLY,
  VALUE_LOOP_STEPS,
} from "@/config/tokenomics";

const accentText = {
  cyan: "text-cyan",
  green: "text-green",
  purple: "text-purple",
} as const;

const accentLock = {
  cyan: "border-cyan/50 bg-cyan/20 text-cyan shadow-[0_0_12px_rgba(0,240,255,0.18)]",
  green: "border-green/50 bg-green/20 text-green shadow-[0_0_12px_rgba(34,197,94,0.2)]",
  purple:
    "border-purple/55 bg-purple/20 text-purple shadow-[0_0_16px_rgba(168,85,247,0.28)]",
} as const;

function formatMillions(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return n.toLocaleString();
}

export function TokenomicsPage() {
  const { openBuyModal } = useWalletUI();

  return (
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-36">
          <div className="pointer-events-none absolute inset-0 scanlines" aria-hidden>
            <div className="absolute -left-1/4 top-1/4 h-[45vmax] w-[45vmax] rounded-full bg-purple/20 blur-[100px] animate-pulse-glow" />
            <div className="absolute -right-1/4 bottom-1/4 h-[40vmax] w-[40vmax] rounded-full bg-cyan/15 blur-[90px]" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void via-void/70 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan sm:text-[11px] sm:tracking-[0.28em]"
            >
              Protocol Economics & Value Capture
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 max-w-4xl font-display text-[clamp(2rem,7vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-glow-cyan"
            >
              THE ENGINE OF ALGORITHMIC WEALTH.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base"
            >
              $NOVA is not a speculative asset. It is the core operational fuel and
              governance token of the Evolgo network — architected for permanent
              value accrual, sustainable yield, and network authority.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <GlowButton variant="cyan" onClick={openBuyModal}>
                Buy $NOVA
              </GlowButton>
              <GlowButton variant="ghost" href="/dashboard/staking">
                Open Staking
              </GlowButton>
            </motion.div>
          </div>
        </section>

        {/* Supply */}
        <section className="relative px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
                450M Hard Cap
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                SUPPLY ARCHITECTURE & VESTING
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                A fixed {TOTAL_SUPPLY.toLocaleString()} hard-cap supply designed
                with strict emission curves and long-term alignment across all
                network participants.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <GlassCard strong>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Total supply
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-cyan sm:text-5xl">
                  450M
                </p>
                <p className="mt-1 font-mono text-sm text-muted">$NOVA · Fixed cap</p>

                <div className="mt-6 space-y-3">
                  {SUPPLY_ALLOCATIONS.map((row) => (
                    <div key={row.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="text-foreground/90">{row.title}</span>
                        <span className="text-cyan">{row.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan/80 to-purple/70"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {SUPPLY_ALLOCATIONS.map((row, i) => (
                  <GlassCard key={row.id} delay={0.05 * i} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold tracking-wide">
                          {row.title}
                        </p>
                        {"vesting" in row && row.vesting && (
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-purple">
                            {row.vesting}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-lg border border-cyan/30 bg-cyan/10 px-2 py-1 font-mono text-xs text-cyan">
                        {row.percent}%
                      </span>
                    </div>
                    <p className="mt-2 font-display text-lg font-bold text-foreground">
                      {formatMillions(row.amount)}{" "}
                      <span className="text-sm font-medium text-muted">$NOVA</span>
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {row.detail}
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Value Accrual Loop */}
        <section className="relative px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-purple">
                Buyback Engine
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                THE PROTOCOL VALUE ACCRUAL LOOP
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Eliminating inflationary printing. Every transaction feeds a
                closed-loop economy that directly rewards committed operators.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {VALUE_LOOP_STEPS.map((step, i) => (
                <GlassCard
                  key={step.step}
                  delay={0.06 * i}
                  className={
                    i === 1
                      ? "border border-purple/35 shadow-[0_0_28px_rgba(168,85,247,0.12)]"
                      : ""
                  }
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
                    Step {step.step}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold tracking-wide">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                  {i < VALUE_LOOP_STEPS.length - 1 && (
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-purple/80 md:hidden">
                      ↓ Next
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>

            <GlassCard strong className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
                Closed loop
              </p>
              <p className="mt-2 font-display text-base font-semibold tracking-wide sm:text-lg">
                Protocol Inflows → Automated Market Buyback → Yield Re-injection
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                Buyback-backed yield replaces inflationary emissions — capital
                that enters the protocol reinforces $NOVA demand and flows back
                to operators who lock for network authority.
              </p>
            </GlassCard>
          </div>
        </section>

        {/* Staking tiers */}
        <section className="relative px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
                  Yield & Authority
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                  STAKING TIERS & NETWORK AUTHORITY
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                  Lock capital to secure protocol yield, elevate referral status,
                  and unlock developer sandboxes.
                </p>
              </div>
              <GlowButton variant="purple" href="/dashboard/staking">
                Enter Staking Console
              </GlowButton>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-3">
              {TOKENOMICS_STAKING_TIERS.map((tier, i) => {
                const isElite = "elite" in tier && tier.elite;
                return (
                <GlassCard
                  key={tier.id}
                  delay={0.06 * i}
                  className={
                    isElite
                      ? "border border-purple/40 shadow-[0_0_32px_rgba(168,85,247,0.14)]"
                      : ""
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`font-mono text-[10px] uppercase tracking-[0.2em] ${accentText[tier.accent]}`}
                      >
                        {tier.tier}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold tracking-wide">
                        {tier.name}
                      </h3>
                    </div>
                    {isElite && (
                      <span className="rounded-full border border-purple/40 bg-purple/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-purple">
                        Elite
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-4 font-display text-2xl font-bold ${accentText[tier.accent]}`}
                  >
                    {tier.apy}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      Lock
                    </span>
                    <span
                      className={`inline-flex rounded-lg border px-2.5 py-1 font-display text-sm font-bold ${accentLock[tier.accent]}`}
                    >
                      {tier.lock}
                    </span>
                  </div>

                  {"minThreshold" in tier && tier.minThreshold && (
                    <p className="mt-3 font-mono text-[11px] text-purple">
                      Min threshold: {tier.minThreshold}
                    </p>
                  )}

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {tier.blurb}
                  </p>
                </GlassCard>
              );
              })}
            </div>

            <p className="mt-6 text-center font-mono text-[11px] text-muted">
              Prefer the live console?{" "}
              <Link
                href="/dashboard/staking"
                className="text-cyan transition-colors hover:text-foreground"
              >
                Open /dashboard/staking
              </Link>
            </p>
          </div>
        </section>
      </main>
  );
}
