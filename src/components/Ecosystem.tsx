"use client";

import Link from "next/link";
import { GlassCard } from "./ui/GlassCard";
import { ProgressBar } from "./ui/ProgressBar";
import { SectionHeading } from "./ui/SectionHeading";

const modules = [
  {
    title: "AI Trading Dashboard",
    href: "/dashboard",
    cta: "Open Console",
    blurb:
      "Real-time signal streams, risk overlays, and one-tap MultiversX execution — built for elite algorithmic operators.",
    features: [
      "Live AI signal feed",
      "Portfolio heatmaps",
      "Strategy backtests",
      "Non-custodial routing",
    ],
    progress: {
      label: "Dashboard Build",
      status: "In Progress",
      value: 62,
      tone: "cyan" as const,
    },
  },
  {
    title: "Staking Pools",
    href: "/dashboard/staking",
    cta: "Preview Staking",
    blurb:
      "Lock $NOVA to secure yield from protocol performance. Tiered pools reward longer commitments and deeper liquidity.",
    features: [
      "Flexible & locked tiers",
      "Buyback-boosted APY",
      "On-chain proofs",
      "Auto-compound options",
    ],
    progress: {
      label: "Staking Infrastructure",
      status: "Coming Soon",
      value: 28,
      tone: "purple" as const,
    },
  },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Ecosystem"
          title="Platform Preview"
          description="EVOLGO — Powered by $NOVA. The stack is coming online — AI trading intelligence and staking pools engineered for MultiversX."
        />

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {modules.map((mod, i) => (
            <GlassCard key={mod.title} delay={i * 0.1} strong className="flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-bold tracking-wide">
                  {mod.title}
                </h3>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    mod.progress.tone === "cyan"
                      ? "border-cyan/30 bg-cyan/10 text-cyan"
                      : "border-purple/30 bg-purple/10 text-purple"
                  }`}
                >
                  {mod.progress.status}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-muted">{mod.blurb}</p>

              <ul className="mt-5 grid grid-cols-2 gap-2">
                {mod.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-foreground/90"
                  >
                    <span className="mr-1.5 text-green">▸</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-4 pt-6">
                <ProgressBar
                  label={mod.progress.label}
                  status={mod.progress.status}
                  progress={mod.progress.value}
                  tone={mod.progress.tone}
                />
                <Link
                  href={mod.href}
                  className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors touch-manipulation ${
                    mod.progress.tone === "cyan"
                      ? "border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20"
                      : "border-purple/30 bg-purple/10 text-purple hover:bg-purple/20"
                  }`}
                >
                  {mod.cta}
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-4 sm:mt-6" delay={0.2}>
          <ProgressBar
            label="Overall Platform Readiness"
            status="Building"
            progress={45}
            tone="green"
          />
        </GlassCard>
      </div>
    </section>
  );
}
