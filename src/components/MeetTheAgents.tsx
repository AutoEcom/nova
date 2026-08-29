"use client";

import Link from "next/link";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeading } from "./ui/SectionHeading";
import { AGENT_CATALOG } from "@/config/agents";

const accentBorder: Record<string, string> = {
  cyan: "border-cyan/25",
  purple: "border-purple/25",
  green: "border-green/25",
};

export function MeetTheAgents() {
  const featured = AGENT_CATALOG.filter((a) => a.freeAccess);
  const agents = featured.length > 0 ? featured : AGENT_CATALOG.slice(0, 1);

  return (
    <section
      id="agents"
      className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Agents"
          title="Meet the Agents"
          description="Autonomous strategies. Backtested before deployment. Continuously monitored in real time."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <GlassCard
              key={agent.id}
              delay={i * 0.08}
              strong
              className={`flex flex-col border ${accentBorder[agent.accent] ?? "border-white/10"}`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Agent {String(i + 1).padStart(2, "0")}
                </span>
                {agent.freeAccess && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green/35 bg-green/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-green">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-green"
                      aria-hidden
                    />
                    Beta · Free Access
                  </span>
                )}
              </div>

              <h3 className="font-display text-xl font-bold tracking-wide">
                {agent.name}
              </h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-cyan">
                {agent.tagline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {agent.blurb}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-2">
                <Attr label="Strategy" value={agent.tagline.split(" ")[0] ?? "—"} />
                <Attr
                  label="Performance"
                  value={`+${agent.pnlPercent}%`}
                />
                <Attr label="Risk" value={agent.risk} />
                <Attr label="Backtest" value={`${agent.winRate}% WR`} />
              </dl>

              <Link
                href="/dashboard/agents"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/20 touch-manipulation"
              >
                Explore Agent →
              </Link>
            </GlassCard>
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          More agents are being trained.
        </p>
      </div>
    </section>
  );
}

function Attr({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-mono text-[12px] text-foreground">
        {value}
      </dd>
    </div>
  );
}
