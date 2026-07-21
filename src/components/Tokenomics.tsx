"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeading } from "./ui/SectionHeading";

const TOTAL_SUPPLY = 450_000_000;

const allocation = [
  { label: "Liquidity & Markets", pct: 30, tone: "cyan" as const },
  { label: "Staking Rewards", pct: 25, tone: "green" as const },
  { label: "Treasury & Buybacks", pct: 20, tone: "purple" as const },
  { label: "Team & Contributors", pct: 15, tone: "cyan" as const },
  { label: "Ecosystem Grants", pct: 10, tone: "green" as const },
];

const toneBar: Record<string, string> = {
  cyan: "bg-cyan shadow-[0_0_12px_rgba(0,240,255,0.5)]",
  purple: "bg-purple shadow-[0_0_12px_rgba(179,71,255,0.5)]",
  green: "bg-green shadow-[0_0_12px_rgba(57,255,138,0.5)]",
};

export function Tokenomics() {
  return (
    <section id="tokenomics" className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Tokenomics"
          title="$NOVA Supply Architecture"
          description="A fixed 450,000,000 $NOVA supply engineered for utility, liquidity depth, and continuous deflation via Buyback & Burn."
        />

        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <GlassCard className="lg:col-span-2" strong>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
              Total Supply
            </p>
            <p className="mt-3 font-display text-4xl font-bold tracking-tight text-glow-cyan sm:text-5xl">
              450M
            </p>
            <p className="mt-1 font-mono text-sm text-cyan">
              {TOTAL_SUPPLY.toLocaleString()} $NOVA
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Hard-capped utility token on MultiversX. No inflation schedule —
              scarcity compounds as protocol revenue fuels permanent burns.
            </p>
          </GlassCard>

          <GlassCard className="lg:col-span-3" delay={0.1}>
            <p className="mb-5 font-display text-sm font-semibold tracking-wide">
              Allocation Breakdown
            </p>
            <ul className="space-y-4">
              {allocation.map((item, i) => (
                <li key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-mono text-muted">
                      {item.pct}% ·{" "}
                      {((TOTAL_SUPPLY * item.pct) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className={`h-full rounded-full ${toneBar[item.tone]}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.9,
                        delay: 0.15 + i * 0.08,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        <GlassCard className="mt-4 sm:mt-6" delay={0.15}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple/15 text-purple btn-glow-purple">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 3c1.5 3 2 4.5 2 7a4 4 0 1 1-8 0c0-2 .8-3.5 2-5 .5 2 1.5 3 2.5 3.5C11 6.5 11.5 4.5 12 3z" />
                <path d="M12 14c0 1.5-.8 2.5-2 3" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold tracking-wide text-purple text-glow-purple sm:text-xl">
                Buyback & Burn Mechanism
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                A portion of platform fees from AI trading performance is
                continuously routed to open-market buybacks. Acquired $NOVA is
                burned on-chain, permanently reducing circulating supply and
                aligning long-term holders with protocol growth. Transparent
                MultiversX transactions — every burn is verifiable.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {["Fee capture", "Open-market buyback", "On-chain burn"].map(
                  (step, i) => (
                    <span
                      key={step}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground"
                    >
                      <span className="text-cyan">{String(i + 1).padStart(2, "0")}</span>
                      {step}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
