"use client";

import { GlassCard } from "./ui/GlassCard";
import { SectionHeading } from "./ui/SectionHeading";

const pillars = [
  {
    title: "Autonomous Access",
    blurb:
      "$NOVA serves as the core utility key required to unlock, deploy, and manage AI trading agents across local and cloud environments.",
    tone: "cyan" as const,
  },
  {
    title: "Execution & Computation",
    blurb:
      "Powering high-frequency strategy evolution, backtest intelligence, and multi-wallet routing on the MultiversX network.",
    tone: "purple" as const,
  },
  {
    title: "Ecosystem Scarcity",
    blurb:
      "Designed with sustainable utility mechanisms, ensuring that protocol growth directly correlates with token value.",
    tone: "green" as const,
  },
];

const toneAccent: Record<(typeof pillars)[number]["tone"], string> = {
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  purple: "border-purple/30 bg-purple/10 text-purple",
  green: "border-green/30 bg-green/10 text-green",
};

export function Tokenomics() {
  return (
    <section id="tokenomics" className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Token & Ecosystem"
          title="The Intelligence Token"
          description="EVOLGO — Powered by $NOVA. Utility engineered for autonomous access, computation, and durable ecosystem scarcity on MultiversX."
        />

        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {pillars.map((pillar, i) => (
            <GlassCard key={pillar.title} delay={i * 0.1} strong className="flex flex-col">
              <span
                className={`mb-4 inline-flex w-fit rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${toneAccent[pillar.tone]}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-xl font-bold tracking-wide">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {pillar.blurb}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
