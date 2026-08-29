"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeading } from "./ui/SectionHeading";
import { AgentTerminalModal } from "@/components/agents/AgentTerminalModal";
import { AGENT_CATALOG } from "@/config/agents";

type ModuleAction =
  | { kind: "terminal"; focusBacktest?: boolean }
  | { kind: "href"; href: string };

const modules: Array<{
  title: string;
  blurb: string;
  tone: "cyan" | "purple" | "green";
  action: ModuleAction;
}> = [
  {
    title: "AI Agents",
    blurb: "Live strategy intelligence",
    tone: "cyan",
    action: { kind: "terminal" },
  },
  {
    title: "Backtests",
    blurb: "Validate before deployment",
    tone: "purple",
    action: { kind: "terminal", focusBacktest: true },
  },
  {
    title: "Live Terminal",
    blurb: "Watch agents operate in real time",
    tone: "green",
    action: { kind: "terminal" },
  },
  {
    title: "Staking",
    blurb:
      "Lock $NOVA → unlock protocol utility. Flexible, 30-day, and 90-day Syndicate tiers (Syndicate min. 10,000 NOVA).",
    tone: "cyan",
    action: { kind: "href", href: "/dashboard/staking" },
  },
  {
    title: "Referrals",
    blurb: "Grow your network & earn rewards",
    tone: "purple",
    action: { kind: "href", href: "/dashboard/referrals" },
  },
];

const toneAccent: Record<(typeof modules)[number]["tone"], string> = {
  cyan: "border-cyan/30 bg-cyan/10 text-cyan group-hover:bg-cyan/20",
  purple: "border-purple/30 bg-purple/10 text-purple group-hover:bg-purple/20",
  green: "border-green/30 bg-green/10 text-green group-hover:bg-green/20",
};

const defaultAgent =
  AGENT_CATALOG.find((a) => a.freeAccess) ?? AGENT_CATALOG[0] ?? null;

export function CommandLayer() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [focusBacktest, setFocusBacktest] = useState(false);

  const openTerminal = (withBacktestFocus: boolean) => {
    setFocusBacktest(withBacktestFocus);
    setTerminalOpen(true);
  };

  const closeTerminal = () => {
    setTerminalOpen(false);
    setFocusBacktest(false);
  };

  return (
    <section
      id="command-layer"
      className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Platform"
          title="The Evolgo Command Layer"
          description="Autonomous trading intelligence, execution layers, staking, and network growth in one unified command surface."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod, i) => {
            const card = (
              <GlassCard
                delay={i * 0.06}
                strong
                className="flex h-full flex-col transition-[border-color,box-shadow] group-hover:border-cyan/30 group-hover:shadow-[0_0_28px_rgba(0,240,255,0.08)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold tracking-wide sm:text-xl">
                    {mod.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${toneAccent[mod.tone]}`}
                  >
                    Live
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{mod.blurb}</p>
                <p className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-wider text-cyan opacity-80 transition-opacity group-hover:opacity-100">
                  Open →
                </p>
              </GlassCard>
            );

            if (mod.action.kind === "href") {
              return (
                <Link
                  key={mod.title}
                  href={mod.action.href}
                  className="group block touch-manipulation"
                >
                  {card}
                </Link>
              );
            }

            return (
              <button
                key={mod.title}
                type="button"
                className="group block w-full cursor-pointer touch-manipulation text-left"
                onClick={() =>
                  openTerminal(mod.action.kind === "terminal" && Boolean(mod.action.focusBacktest))
                }
              >
                {card}
              </button>
            );
          })}
        </div>
      </div>

      <AgentTerminalModal
        open={terminalOpen}
        agent={defaultAgent}
        focusBacktest={focusBacktest}
        onClose={closeTerminal}
      />
    </section>
  );
}
