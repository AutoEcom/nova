/**
 * Agent marketplace catalog — pricing + display metrics for /dashboard/agents.
 */

import { NOVA_PRICE_IN_USDC } from "@/config/network";

export type AgentRiskProfile = "Conservative" | "Balanced" | "Aggressive";
export type AgentRuntimeStatus = "live" | "warming" | "paused";

export type AgentDefinition = {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  /** Display metrics (telemetry surface — not a live exchange feed yet). */
  winRate: number;
  pnlPercent: number;
  risk: AgentRiskProfile;
  status: AgentRuntimeStatus;
  accent: "cyan" | "purple" | "green";
  signals: string[];
  /** Public terminal access — no subscription / paywall. */
  freeAccess?: boolean;
};

/** Monthly subscription in USDC. */
export const AGENT_SUBSCRIPTION_USDC = 30;

/** $NOVA discount vs USDC face value (20% off). */
export const AGENT_NOVA_DISCOUNT = 0.2;

/** Face $NOVA for a month at list price, before discount. */
export function agentSubscriptionNovaFace(): number {
  return Math.round(AGENT_SUBSCRIPTION_USDC / NOVA_PRICE_IN_USDC);
}

/** Discounted $NOVA due for monthly access. */
export function agentSubscriptionNovaAmount(): number {
  return Math.round(agentSubscriptionNovaFace() * (1 - AGENT_NOVA_DISCOUNT));
}

export const AGENT_CATALOG: readonly AgentDefinition[] = [
  {
    id: "nova-regressors",
    name: "Nova Regressors",
    tagline: "Mean-Reversion Intelligence",
    blurb:
      "Statistical reversion engine tuned for MultiversX liquidity pockets. Compiles micro-edges into autonomous execution cycles.",
    winRate: 68.4,
    pnlPercent: 42.7,
    risk: "Balanced",
    status: "live",
    accent: "cyan",
    signals: ["Spread capture", "Latency-aware fills", "Kill-switch ready"],
    freeAccess: true,
  },
  {
    id: "pulse-sentinel",
    name: "Pulse Sentinel",
    tagline: "Momentum & Breakout Scout",
    blurb:
      "Watches order-flow impulses and deploys only when conviction thresholds clear. Built for burst regimes.",
    winRate: 61.2,
    pnlPercent: 55.1,
    risk: "Aggressive",
    status: "live",
    accent: "purple",
    signals: ["Impulse detect", "Volatility bands", "Trail protection"],
  },
  {
    id: "vault-guardian",
    name: "Vault Guardian",
    tagline: "Capital Preservation Core",
    blurb:
      "Defensive allocator that prioritizes drawdown control and steady compounding across quiet markets.",
    winRate: 74.9,
    pnlPercent: 18.3,
    risk: "Conservative",
    status: "live",
    accent: "green",
    signals: ["Drawdown caps", "Inventory hedge", "Slow-compound mode"],
  },
] as const;

export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENT_CATALOG.find((a) => a.id === id);
}
