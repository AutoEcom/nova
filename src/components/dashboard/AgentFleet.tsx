"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgentLaunchModals } from "@/components/agents/AgentLaunchModals";
import { useAgentLaunchFlow } from "@/components/agents/useAgentLaunchFlow";
import { BinanceMark, OkxMark } from "@/components/exchanges/ExchangeLogos";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  AGENT_CATALOG,
  formatMaxDrawdown,
  isAgentLaunchable,
  type AgentAvailability,
  type AgentDefinition,
} from "@/config/agents";
import { type EvolgoVenue } from "@/config/exchanges";
import type { DashboardStatus } from "@/config/dashboard";
import {
  fetchActiveAgentSession,
  type ActiveAgentSession,
} from "@/lib/agents/terminalApi";

function availabilityToDashboardStatus(
  availability: AgentAvailability,
): DashboardStatus {
  if (availability === "live") return "live";
  if (availability === "in_training") return "in-progress";
  return "coming-soon";
}

function VenueLogo({ venue }: { venue: EvolgoVenue }) {
  if (venue === "okx") return <OkxMark size={16} />;
  if (venue === "binance") return <BinanceMark size={16} />;
  // Bybit reserved — no mark in fleet strip until connect ships
  return null;
}

function shortSessionId(sessionId: string): string {
  const id = sessionId.trim();
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

type LiveSessionRow = {
  agent: AgentDefinition;
  session: ActiveAgentSession;
};

function AgentFleetRow({
  agent,
  busy,
  onOpenTerminal,
  onViewAgents,
}: {
  agent: AgentDefinition;
  busy: boolean;
  onOpenTerminal: (agent: AgentDefinition) => void;
  onViewAgents: (agent: AgentDefinition) => void;
}) {
  const launchable = isAgentLaunchable(agent);

  return (
    <div className="flex flex-col gap-3 border-b border-white/8 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-semibold tracking-wide text-foreground sm:text-base">
            {agent.name}
          </h3>
          <StatusBadge
            status={availabilityToDashboardStatus(agent.availability)}
            className="!px-2 !py-0.5 !text-[9px]"
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-muted">
          <span>
            Win{" "}
            <span className="text-cyan">{agent.winRate.toFixed(1)}%</span>
          </span>
          <span>
            MDD{" "}
            <span className="text-loss">
              {formatMaxDrawdown(agent.maxDrawdownPct)}
            </span>
          </span>
          <span>
            Risk <span className="text-foreground">{agent.riskBand}</span>
          </span>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {agent.supportedVenues.map((venue) => {
            const mark = <VenueLogo venue={venue} />;
            if (!mark) return null;
            return (
              <li
                key={venue}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] px-2 py-1"
                title={venue}
              >
                {mark}
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                  {venue === "okx" ? "OKX" : "Binance"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <GlowButton
        variant={launchable ? "cyan" : "ghost"}
        className="!w-full !px-3 !py-2 !text-[11px] sm:!w-auto"
        disabled={busy}
        onClick={() =>
          launchable ? onOpenTerminal(agent) : onViewAgents(agent)
        }
      >
        {busy ? "Opening…" : launchable ? "Open terminal" : "View agents"}
      </GlowButton>
    </div>
  );
}

/** Operator Overview — Command Center summary with real launch path. */
export function AgentFleet() {
  const router = useRouter();
  const launch = useAgentLaunchFlow();
  const [liveSessions, setLiveSessions] = useState<LiveSessionRow[]>([]);

  useEffect(() => {
    const launchable = AGENT_CATALOG.filter(isAgentLaunchable);
    if (!launchable.length) {
      setLiveSessions([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      const results = await Promise.all(
        launchable.map(async (agent) => {
          const result = await fetchActiveAgentSession(
            agent.id,
            agent.strategyId,
            controller.signal,
          );
          if (!result?.recovered || !result.session?.sessionId) return null;
          return { agent, session: result.session } satisfies LiveSessionRow;
        }),
      );
      if (cancelled) return;
      setLiveSessions(
        results.filter((row): row is LiveSessionRow => row != null),
      );
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const onOpenTerminal = (agent: AgentDefinition) => {
    void launch.handleLaunch(agent);
  };

  const onViewAgents = (agent: AgentDefinition) => {
    router.push(`/dashboard/agents#${agent.id}`);
  };

  const onResume = (agent: AgentDefinition) => {
    launch.openTerminal(agent);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
            Evolgo Command Center
          </p>
          <h2 className="mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl">
            Agent fleet
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Evolgo autonomous agents · open terminal from Agents
          </p>
        </div>
        <Link href="/dashboard/agents">
          <GlowButton variant="ghost" className="!px-3 !py-2 !text-[11px]">
            Open Agents
          </GlowButton>
        </Link>
      </div>

      {/* System strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Venues
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground">
          <BinanceMark size={18} />
          Binance
        </span>
        <span className="text-white/20" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground">
          <OkxMark size={18} />
          OKX
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-green">
          <span
            className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_6px_rgba(14,203,129,0.65)]"
            aria-hidden
          />
          Command Center online
        </span>
      </div>

      {/* Live sessions — soft-fail hidden when empty */}
      {liveSessions.length > 0 && (
        <GlassCard strong delay={0.04} className="!py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold tracking-wide">
              Live sessions
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-wider text-green">
              Recovered
            </p>
          </div>
          <ul className="space-y-2">
            {liveSessions.map(({ agent, session }) => {
              const venue = agent.preferredVenue ?? agent.supportedVenues[0];
              return (
                <li
                  key={`${agent.id}-${session.sessionId}`}
                  className="flex flex-col gap-2 rounded-lg border border-white/10 bg-void/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-semibold tracking-wide">
                        {agent.name}
                      </p>
                      {venue && (
                        <span className="inline-flex items-center gap-1">
                          <VenueLogo venue={venue} />
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-muted">
                      {shortSessionId(session.sessionId)}
                      {session.capitalUsd != null
                        ? ` · $${session.capitalUsd.toLocaleString()} capital`
                        : ""}
                    </p>
                  </div>
                  <GlowButton
                    variant="cyan"
                    className="!px-3 !py-2 !text-[11px]"
                    onClick={() => onResume(agent)}
                  >
                    Resume
                  </GlowButton>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}

      <GlassCard strong delay={0.08}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-wide">
            Catalog agents
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Catalog metrics · not live P&amp;L
          </p>
        </div>
        <div>
          {AGENT_CATALOG.map((agent) => (
            <AgentFleetRow
              key={agent.id}
              agent={agent}
              busy={launch.busyId === agent.id}
              onOpenTerminal={onOpenTerminal}
              onViewAgents={onViewAgents}
            />
          ))}
        </div>
      </GlassCard>

      {launch.banner && (
        <p className="font-mono text-[11px] text-magenta">{launch.banner}</p>
      )}

      <AgentLaunchModals
        selected={launch.selected}
        walletAddress={launch.walletAddress}
        paywallOpen={launch.paywallOpen}
        terminalOpen={launch.terminalOpen}
        terminalExpiresAt={launch.terminalExpiresAt}
        onClosePaywall={launch.closePaywall}
        onPaywallConnect={launch.onPaywallConnect}
        onSubscribed={launch.onSubscribed}
        onCloseTerminal={launch.closeTerminal}
      />
    </section>
  );
}
