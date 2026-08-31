/**
 * Agent marketplace catalog — pricing + display metrics for /dashboard/agents.
 */

import { NOVA_PRICE_IN_USDC } from "@/config/network";

export type AgentAvailability = "live" | "in_training" | "coming_soon";
export type AgentRuntimeStatus = "live" | "warming" | "paused";
export type RiskBand = "Low" | "Moderate" | "Elevated" | "High";

export type AgentDefinition = {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  /** Bound orchestrator strategy — dedicated terminal workspace (no in-terminal switching). */
  strategyId: string;
  /** Display metrics (telemetry surface). */
  winRate: number;
  pnlPercent: number;
  /** Historical max drawdown as negative percent, e.g. -14.2 */
  maxDrawdownPct: number;
  /** Composite risk score 0–100. */
  riskScore: number;
  riskBand: RiskBand;
  status: AgentRuntimeStatus;
  availability: AgentAvailability;
  accent: "cyan" | "purple" | "green";
  signals: string[];
  /** Public terminal access — no subscription / paywall. */
  freeAccess?: boolean;
};

/** Platform minimum capital allocation (USD) for agent start / backtest. */
export const MIN_CAPITAL_ALLOCATION_USD = 100;

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

export function formatRiskScore(score: number, band: RiskBand): string {
  return `${score}% (${band})`;
}

export function formatMaxDrawdown(pct: number): string {
  const v = pct <= 0 ? pct : -Math.abs(pct);
  return `${v.toFixed(1)}%`;
}

export function isAgentLaunchable(agent: AgentDefinition): boolean {
  return agent.availability === "live";
}

export const AGENT_CATALOG: readonly AgentDefinition[] = [
  {
    id: "evolgo-consensus",
    name: "Evolgo Consensus AI",
    tagline: "EvolgoConsensusStrategy",
    blurb:
      "Multi-signal consensus orchestrator across the top liquid Binance Futures markets. Mean reversion, microstructure filters, and continuous risk gating in one dedicated workspace.",
    strategyId: "evolgo-consensus",
    winRate: 68.4,
    pnlPercent: 42.7,
    maxDrawdownPct: -14.2,
    riskScore: 34,
    riskBand: "Moderate",
    status: "live",
    availability: "live",
    accent: "cyan",
    signals: ["Top-10 futures book", "Consensus filters", "Kill-switch ready"],
    freeAccess: true,
  },
  {
    id: "evolgo-pump-hunter",
    name: "EvolgoPumpHunter",
    tagline: "Impulse / Breakout Scout",
    blurb:
      "Impulse and breakout hunter for short-lived momentum bursts. Currently in training on high-volatility futures regimes.",
    strategyId: "evolgo-pump-hunter",
    winRate: 61.2,
    pnlPercent: 55.1,
    maxDrawdownPct: -22.8,
    riskScore: 62,
    riskBand: "Elevated",
    status: "warming",
    availability: "in_training",
    accent: "purple",
    signals: ["Impulse detect", "Volatility bands", "Trail protection"],
  },
  {
    id: "vault-guardian",
    name: "Vault Guardian",
    tagline: "Capital Preservation Core",
    blurb:
      "Defensive allocator prioritizing drawdown control and steady compounding. Scheduled for the next training cohort.",
    strategyId: "evolgo-consensus",
    winRate: 74.9,
    pnlPercent: 18.3,
    maxDrawdownPct: -8.6,
    riskScore: 22,
    riskBand: "Low",
    status: "paused",
    availability: "coming_soon",
    accent: "green",
    signals: ["Drawdown caps", "Inventory hedge", "Slow-compound mode"],
  },
] as const;

/** Legacy marketplace id → current catalog entry. */
const AGENT_ID_ALIASES: Record<string, string> = {
  "nova-regressors": "evolgo-consensus",
  "pulse-sentinel": "evolgo-pump-hunter",
};

export function getAgentById(id: string): AgentDefinition | undefined {
  const resolved = AGENT_ID_ALIASES[id] ?? id;
  return AGENT_CATALOG.find((a) => a.id === resolved);
}
