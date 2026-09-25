"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentLaunchModals } from "@/components/agents/AgentLaunchModals";
import { useAgentLaunchFlow } from "@/components/agents/useAgentLaunchFlow";
import { GlassCard } from "@/components/ui/GlassCard";
import { AGENT_CATALOG, getAgentById } from "@/config/agents";

export function AgentsMarketplace() {
  const launch = useAgentLaunchFlow();

  /** Accordion: only one panel open; default = first agent or hash target. */
  const [expandedId, setExpandedId] = useState<string>(
    AGENT_CATALOG[0]?.id ?? "",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "").trim();
    if (!raw) return;
    const agent = getAgentById(raw);
    if (agent) setExpandedId(agent.id);
  }, []);

  const handleToggle = useCallback((agentId: string) => {
    setExpandedId((current) => (current === agentId ? "" : agentId));
  }, []);

  return (
    <div className="mx-auto w-full space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            Agents
          </p>
          <h1 className="font-display text-lg font-semibold tracking-wide text-foreground sm:text-xl">
            Autonomous Trading Intelligence
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            Deploy institutional-grade Evolgo agents. Monitor live execution
            telemetry, real-time performance streams, and autonomous alpha
            generation across the network.
          </p>
        </div>
        <p className="shrink-0 font-mono text-[10px] text-muted">
          {launch.loadingSubs
            ? "Syncing…"
            : launch.isLoggedIn
              ? `${Object.values(launch.subs).filter((s) => s.active).length} paid clearance(s)`
              : "Evolgo Consensus AI · free to launch"}
        </p>
      </div>

      {launch.banner && (
        <GlassCard className="!py-3">
          <p className="font-mono text-[11px] text-magenta">{launch.banner}</p>
        </GlassCard>
      )}

      <div className="flex flex-col gap-2.5">
        {AGENT_CATALOG.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            expanded={expandedId === agent.id}
            onToggle={() => handleToggle(agent.id)}
            subscribed={launch.isSubscribed(agent)}
            busy={launch.busyId === agent.id}
            delay={0.04 * i}
            onLaunch={(a) => void launch.handleLaunch(a)}
          />
        ))}
      </div>

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
    </div>
  );
}
