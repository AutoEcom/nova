"use client";

import { GlassCard } from "./ui/GlassCard";
import { SectionHeading } from "./ui/SectionHeading";
import { GlowButton } from "./ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";

const utilities = [
  {
    title: "Access",
    blurb: "Unlock AI agents",
    tone: "cyan" as const,
  },
  {
    title: "Compute",
    blurb: "Power strategy intelligence",
    tone: "purple" as const,
  },
  {
    title: "Stake",
    blurb: "Lock $NOVA for protocol utility",
    tone: "green" as const,
  },
  {
    title: "Participate",
    blurb: "Referrals & ecosystem rewards",
    tone: "cyan" as const,
  },
];

const toneAccent: Record<(typeof utilities)[number]["tone"], string> = {
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  purple: "border-purple/30 bg-purple/10 text-purple",
  green: "border-green/30 bg-green/10 text-green",
};

export function Tokenomics() {
  const { openBuyModal } = useWalletUI();

  return (
    <section
      id="tokenomics"
      className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="$NOVA"
          title="One token. The intelligence layer."
          description="$NOVA is the utility layer powering access, execution, staking and ecosystem participation across EVOLGO."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {utilities.map((item, i) => (
            <GlassCard
              key={item.title}
              delay={i * 0.08}
              strong
              className="flex flex-col"
            >
              <span
                className={`mb-4 inline-flex w-fit rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${toneAccent[item.tone]}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-lg font-bold tracking-wide sm:text-xl">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.blurb}
              </p>
            </GlassCard>
          ))}
        </div>

        <GlassCard
          strong
          delay={0.2}
          className="mt-6 border border-cyan/20 sm:mt-8"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
                Early access
              </p>
              <h3 className="mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl">
                Early access is live
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                $NOVA is currently available through EVOLGO at a fixed $0.01
                early-access price. Get positioned before the ecosystem expands
                and DEX liquidity goes live.
              </p>
            </div>
            <GlowButton
              variant="cyan"
              className="shrink-0"
              onClick={openBuyModal}
            >
              Get $NOVA →
            </GlowButton>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
