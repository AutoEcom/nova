"use client";

import { useCallback, useEffect, useState } from "react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentPaywallModal } from "@/components/agents/AgentPaywallModal";
import { AgentTerminalModal } from "@/components/agents/AgentTerminalModal";
import { GlassCard } from "@/components/ui/GlassCard";
import { AGENT_CATALOG, isAgentLaunchable, type AgentDefinition } from "@/config/agents";
import { useWalletUI } from "@/providers/WalletUIProvider";

type SubMap = Record<string, { active: boolean; expiresAt?: string }>;

export function AgentsMarketplace() {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();

  const [subs, setSubs] = useState<SubMap>({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentDefinition | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  /** Accordion: only one panel open; default = first agent. */
  const [expandedId, setExpandedId] = useState<string>(
    AGENT_CATALOG[0]?.id ?? "",
  );

  const refreshSubscriptions = useCallback(async (address: string) => {
    setLoadingSubs(true);
    try {
      const res = await fetch(
        `/api/agents/subscription?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        activeAgentIds?: string[];
        subscriptions?: Array<{ agentId: string; expiresAt: string }>;
        error?: string;
      };
      if (!res.ok) {
        setBanner(json.error ?? "Could not load subscriptions");
        return;
      }
      const next: SubMap = {};
      for (const id of json.activeAgentIds ?? []) {
        next[id] = { active: true };
      }
      for (const s of json.subscriptions ?? []) {
        next[s.agentId] = { active: true, expiresAt: s.expiresAt };
      }
      setSubs(next);
      setBanner(null);
    } catch {
      setBanner("Subscription check failed — retry shortly");
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && account.address) {
      void refreshSubscriptions(account.address);
    } else {
      setSubs({});
    }
  }, [isLoggedIn, account.address, refreshSubscriptions]);

  const openTerminal = (agent: AgentDefinition, expiresAt?: string) => {
    setSelected(agent);
    if (expiresAt) {
      setSubs((prev) => ({
        ...prev,
        [agent.id]: { active: true, expiresAt },
      }));
    }
    setTerminalOpen(true);
  };

  const handleLaunch = async (agent: AgentDefinition) => {
    if (!isAgentLaunchable(agent)) {
      setBanner(`${agent.name} is not launchable yet — ${agent.availability.replace("_", " ")}`);
      return;
    }

    // Production-ready free agent — skip paywall / subscription entirely.
    if (agent.freeAccess) {
      openTerminal(agent);
      return;
    }

    if (!isLoggedIn || !account.address) {
      openConnect();
      return;
    }

    setBusyId(agent.id);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/agents/subscription?address=${encodeURIComponent(account.address)}&agentId=${encodeURIComponent(agent.id)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        active?: boolean;
        subscription?: { expiresAt?: string };
        error?: string;
      };

      if (!res.ok) {
        setBanner(json.error ?? "Subscription service unavailable");
        setSelected(agent);
        setPaywallOpen(true);
        return;
      }

      if (json.active) {
        openTerminal(agent, json.subscription?.expiresAt);
        return;
      }

      setSelected(agent);
      setPaywallOpen(true);
    } catch {
      setBanner("Could not verify access — try again");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = (agentId: string) => {
    setExpandedId((current) => (current === agentId ? "" : agentId));
  };

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
          {loadingSubs
            ? "Syncing…"
            : isLoggedIn
              ? `${Object.values(subs).filter((s) => s.active).length} paid clearance(s)`
              : "Evolgo Consensus AI · free to launch"}
        </p>
      </div>

      {banner && (
        <GlassCard className="!py-3">
          <p className="font-mono text-[11px] text-magenta">{banner}</p>
        </GlassCard>
      )}

      <div className="flex flex-col gap-2.5">
        {AGENT_CATALOG.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            expanded={expandedId === agent.id}
            onToggle={() => handleToggle(agent.id)}
            subscribed={Boolean(agent.freeAccess || subs[agent.id]?.active)}
            busy={busyId === agent.id}
            delay={0.04 * i}
            onLaunch={(a) => void handleLaunch(a)}
          />
        ))}
      </div>

      <AgentPaywallModal
        open={paywallOpen}
        agent={selected}
        walletAddress={account.address ?? null}
        onClose={() => {
          setPaywallOpen(false);
        }}
        onConnect={() => {
          setPaywallOpen(false);
          openConnect();
        }}
        onSubscribed={(expiresAt) => {
          if (!selected) return;
          setSubs((prev) => ({
            ...prev,
            [selected.id]: { active: true, expiresAt },
          }));
          setPaywallOpen(false);
          setTerminalOpen(true);
          if (account.address) void refreshSubscriptions(account.address);
        }}
      />

      <AgentTerminalModal
        open={terminalOpen}
        agent={selected}
        expiresAt={
          selected?.freeAccess
            ? null
            : selected
              ? subs[selected.id]?.expiresAt
              : null
        }
        onClose={() => setTerminalOpen(false)}
      />
    </div>
  );
}
