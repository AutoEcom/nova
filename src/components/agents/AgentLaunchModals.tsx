"use client";

import { AgentPaywallModal } from "@/components/agents/AgentPaywallModal";
import { AgentTerminalModal } from "@/components/agents/AgentTerminalModal";
import type { AgentDefinition } from "@/config/agents";

type AgentLaunchModalsProps = {
  selected: AgentDefinition | null;
  walletAddress: string | null;
  paywallOpen: boolean;
  terminalOpen: boolean;
  terminalExpiresAt: string | null;
  onClosePaywall: () => void;
  onPaywallConnect: () => void;
  onSubscribed: (expiresAt: string) => void;
  onCloseTerminal: () => void;
};

/** Shared paywall + terminal host for marketplace and Overview Command Center. */
export function AgentLaunchModals({
  selected,
  walletAddress,
  paywallOpen,
  terminalOpen,
  terminalExpiresAt,
  onClosePaywall,
  onPaywallConnect,
  onSubscribed,
  onCloseTerminal,
}: AgentLaunchModalsProps) {
  return (
    <>
      <AgentPaywallModal
        open={paywallOpen}
        agent={selected}
        walletAddress={walletAddress}
        onClose={onClosePaywall}
        onConnect={onPaywallConnect}
        onSubscribed={onSubscribed}
      />
      <AgentTerminalModal
        open={terminalOpen}
        agent={selected}
        expiresAt={terminalExpiresAt}
        onClose={onCloseTerminal}
      />
    </>
  );
}
