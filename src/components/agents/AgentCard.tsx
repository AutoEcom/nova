"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import type { AgentDefinition } from "@/config/agents";

const accentRing: Record<AgentDefinition["accent"], string> = {
  cyan: "border-cyan/25 hover:border-cyan/40",
  purple: "border-purple/25 hover:border-purple/40",
  green: "border-green/25 hover:border-green/40",
};

const statusStyle: Record<AgentDefinition["status"], string> = {
  live: "border-green/35 bg-green/12 text-green",
  warming: "border-cyan/35 bg-cyan/12 text-cyan",
  paused: "border-white/15 bg-white/[0.04] text-muted",
};

type AgentCardProps = {
  agent: AgentDefinition;
  expanded: boolean;
  onToggle: () => void;
  subscribed: boolean;
  busy?: boolean;
  delay?: number;
  onLaunch: (agent: AgentDefinition) => void;
};

export function AgentCard({
  agent,
  expanded,
  onToggle,
  subscribed,
  busy,
  delay = 0,
  onLaunch,
}: AgentCardProps) {
  const accessLabel = agent.freeAccess
    ? "Free Access"
    : subscribed
      ? "Subscribed"
      : "Locked";
  const accessTone = agent.freeAccess || subscribed ? "text-green" : "text-muted";

  const metrics = [
    {
      label: "Live Win Rate",
      value: `${agent.winRate.toFixed(1)}%`,
      tone: "text-cyan",
    },
    {
      label: "Hist. PnL",
      value: `+${agent.pnlPercent.toFixed(1)}%`,
      tone: "text-green",
    },
    {
      label: "Risk Profile",
      value: agent.risk,
      tone: "text-foreground",
    },
    {
      label: "Access Status",
      value: accessLabel,
      tone: accessTone,
    },
  ] as const;

  const chart = buildPeriodSeries(agent);

  return (
    <GlassCard
      delay={delay}
      strong
      className={`relative overflow-hidden border ${accentRing[agent.accent]} !p-0`}
    >
      {/* Collapsed / always-visible header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:gap-4 sm:px-5 sm:py-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-cyan/45 bg-cyan/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan shadow-[0_0_12px_rgba(0,240,255,0.12)]">
              {agent.tagline}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${statusStyle[agent.status]}`}
            >
              <span
                className={`h-1 w-1 rounded-full ${
                  agent.status === "live"
                    ? "bg-green shadow-[0_0_6px_rgba(57,255,138,0.65)] animate-pulse"
                    : "bg-current opacity-70"
                }`}
                aria-hidden
              />
              {agent.status}
            </span>
            {agent.freeAccess && (
              <span className="inline-flex rounded-md border border-green/40 bg-green/12 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-green">
                Free
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-sm font-semibold tracking-wide text-foreground sm:text-base">
            {agent.name}
          </h3>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            Win Rate
          </p>
          <p className="mt-0.5 font-display text-sm font-semibold text-cyan">
            {agent.winRate.toFixed(1)}%
          </p>
        </div>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] font-mono text-sm text-cyan transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/8"
          >
            <div className="grid gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
              <div className="min-w-0 space-y-3">
                <p className="text-[13px] leading-6 text-muted">{agent.blurb}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {agent.signals.map((s) => (
                    <li
                      key={s}
                      className="rounded bg-white/[0.035] px-2 py-0.5 font-mono text-[9px] tracking-wide text-muted/90"
                    >
                      {s}
                    </li>
                  ))}
                </ul>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 sm:grid-cols-4">
                  {metrics.map((m) => (
                    <div key={m.label} className="min-w-0">
                      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        {m.label}
                      </dt>
                      <dd
                        className={`mt-1 font-display text-sm font-semibold tracking-wide ${m.tone}`}
                      >
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-xl border border-white/8 bg-void/50 px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                    Performance by period
                  </p>
                  <p className="font-mono text-[9px] text-cyan">
                    +{agent.pnlPercent.toFixed(1)}%
                  </p>
                </div>
                <svg
                  viewBox="0 0 220 64"
                  className="h-14 w-full"
                  aria-hidden
                >
                  <path
                    d={chart.path}
                    fill="none"
                    stroke="rgba(0,240,255,0.85)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="mt-1.5 flex justify-between font-mono text-[9px] text-muted">
                  {chart.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col justify-end lg:w-44">
                <GlowButton
                  variant="cyan"
                  fullWidth
                  onClick={() => onLaunch(agent)}
                  className={`!px-4 !py-3 !text-xs ${busy ? "pointer-events-none opacity-50" : ""}`}
                >
                  Launch Terminal
                </GlowButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function buildPeriodSeries(agent: AgentDefinition): {
  path: string;
  labels: string[];
} {
  const seed = agent.winRate + agent.pnlPercent;
  const values = [0.35, 0.55, 0.48, 0.72, 0.66, 0.88, 1].map((t, i) => {
    const wave = Math.sin(seed / 12 + i * 0.9) * 8;
    return Math.max(8, agent.pnlPercent * t + wave);
  });
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 220;
      const y = 56 - ((v - min) / span) * 44;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return { path, labels: ["7D", "14D", "30D", "60D", "90D", "180D", "1Y"] };
}
