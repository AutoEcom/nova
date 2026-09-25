"use client";

import { useCallback, useEffect, useState } from "react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { isAgentLaunchable, type AgentDefinition } from "@/config/agents";
import { useWalletUI } from "@/providers/WalletUIProvider";

export type AgentSubMap = Record<string, { active: boolean; expiresAt?: string }>;

/**
 * Shared agent launch path (marketplace + Overview Command Center).
 * Free / subscribed → terminal; paid without sub → paywall → terminal.
 */
export function useAgentLaunchFlow() {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();

  const [subs, setSubs] = useState<AgentSubMap>({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentDefinition | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

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
      const next: AgentSubMap = {};
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

  const openTerminal = useCallback(
    (agent: AgentDefinition, expiresAt?: string) => {
      setSelected(agent);
      if (expiresAt) {
        setSubs((prev) => ({
          ...prev,
          [agent.id]: { active: true, expiresAt },
        }));
      }
      setTerminalOpen(true);
    },
    [],
  );

  const handleLaunch = useCallback(
    async (agent: AgentDefinition) => {
      if (!isAgentLaunchable(agent)) {
        setBanner(
          `${agent.name} is not launchable yet — ${agent.availability.replace("_", " ")}`,
        );
        return;
      }

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
    },
    [account.address, isLoggedIn, openConnect, openTerminal],
  );

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
  }, []);

  const closeTerminal = useCallback(() => {
    setTerminalOpen(false);
  }, []);

  const onPaywallConnect = useCallback(() => {
    setPaywallOpen(false);
    openConnect();
  }, [openConnect]);

  const onSubscribed = useCallback(
    (expiresAt: string) => {
      if (!selected) return;
      setSubs((prev) => ({
        ...prev,
        [selected.id]: { active: true, expiresAt },
      }));
      setPaywallOpen(false);
      setTerminalOpen(true);
      if (account.address) void refreshSubscriptions(account.address);
    },
    [account.address, refreshSubscriptions, selected],
  );

  const isSubscribed = useCallback(
    (agent: AgentDefinition) =>
      Boolean(agent.freeAccess || subs[agent.id]?.active),
    [subs],
  );

  const terminalExpiresAt =
    selected?.freeAccess
      ? null
      : selected
        ? (subs[selected.id]?.expiresAt ?? null)
        : null;

  return {
    isLoggedIn,
    walletAddress: account.address ?? null,
    subs,
    loadingSubs,
    busyId,
    selected,
    paywallOpen,
    terminalOpen,
    terminalExpiresAt,
    banner,
    setBanner,
    refreshSubscriptions,
    openTerminal,
    handleLaunch,
    closePaywall,
    closeTerminal,
    onPaywallConnect,
    onSubscribed,
    isSubscribed,
  };
}
