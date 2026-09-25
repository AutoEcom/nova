/**
 * Agent marketplace catalog — pricing + display metrics for /dashboard/agents.
 */

import type { EvolgoVenue } from "@/config/exchanges";
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
  /** Venues this agent can execute on (futures). */
  supportedVenues: EvolgoVenue[];
  /** Soft default when user has no preference. */
  preferredVenue?: EvolgoVenue;
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
  /**
   * Exact $NOVA due for a monthly subscription when set.
   * When omitted, falls back to the global USDC → NOVA formula (+ discount).
   */
  subscriptionNova?: number;
  /** Default futures leverage for Live sessions (user-overridable in terminal). */
  defaultLeverage?: number;
};

const DEFAULT_VENUES: EvolgoVenue[] = ["binance", "okx"];

/** Platform minimum capital allocation (USD) for agent start / backtest. */
export const MIN_CAPITAL_ALLOCATION_USD = 100;

/** Futures leverage bounds for terminal / Live session registration. */
export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 20;
export const FALLBACK_DEFAULT_LEVERAGE = 3;

/** Monthly subscription in USDC (default catalog price). */
export const AGENT_SUBSCRIPTION_USDC = 30;

/** $NOVA discount vs USDC face value (20% off) for the default catalog price. */
export const AGENT_NOVA_DISCOUNT = 0.2;

type AgentPriceSource = Pick<AgentDefinition, "subscriptionNova"> | null | undefined;

/** Face $NOVA for a month at list price (before discount), or exact override. */
export function agentSubscriptionNovaFace(agent?: AgentPriceSource): number {
  if (agent?.subscriptionNova != null && agent.subscriptionNova > 0) {
    return Math.round(agent.subscriptionNova);
  }
  return Math.round(AGENT_SUBSCRIPTION_USDC / NOVA_PRICE_IN_USDC);
}

/** Discounted / due $NOVA for monthly access (or exact override). */
export function agentSubscriptionNovaAmount(agent?: AgentPriceSource): number {
  if (agent?.subscriptionNova != null && agent.subscriptionNova > 0) {
    return Math.round(agent.subscriptionNova);
  }
  return Math.round(agentSubscriptionNovaFace() * (1 - AGENT_NOVA_DISCOUNT));
}

/** USDC due for monthly access (derived from NOVA override when set). */
export function agentSubscriptionUsdc(agent?: AgentPriceSource): number {
  if (agent?.subscriptionNova != null && agent.subscriptionNova > 0) {
    return Math.round(agent.subscriptionNova * NOVA_PRICE_IN_USDC * 100) / 100;
  }
  return AGENT_SUBSCRIPTION_USDC;
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
    id: "evolgo-adaptive-mtf",
    name: "Evolgo Adaptive MTF",
    tagline: "EvolgoAdaptiveMTFStrategy",
    blurb:
      "Adaptive multi-timeframe intelligence combining Supertrend structure, EMA regime filters, and real-time EvolgoAI orchestration. Designed for balanced risk-adjusted performance across major Binance Futures pairs.",
    strategyId: "evolgo-adaptive-mtf",
    supportedVenues: DEFAULT_VENUES,
    preferredVenue: "binance",
    winRate: 86.1,
    pnlPercent: 10.4,
    maxDrawdownPct: -8.8,
    riskScore: 31,
    riskBand: "Moderate",
    status: "live",
    availability: "live",
    accent: "cyan",
    signals: ["Multi-timeframe filter", "Adaptive trailing", "Orchestrator consensus"],
    subscriptionNova: 50,
    freeAccess: false,
    defaultLeverage: 5,
  },
  {
    id: "evolgo-consensus",
    name: "Evolgo Consensus AI",
    tagline: "EvolgoConsensusStrategy",
    blurb:
      "Multi-signal consensus orchestrator across the top liquid Binance Futures markets. Mean reversion, microstructure filters, and continuous risk gating in one dedicated workspace.",
    strategyId: "evolgo-consensus",
    supportedVenues: DEFAULT_VENUES,
    preferredVenue: "binance",
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
    defaultLeverage: 3,
  },
  {
    id: "evolgo-pump-hunter",
    name: "EvolgoPumpHunter",
    tagline: "Impulse / Breakout Scout",
    blurb:
      "Impulse and breakout hunter for short-lived momentum bursts. Currently in training on high-volatility futures regimes.",
    strategyId: "evolgo-pump-hunter",
    supportedVenues: DEFAULT_VENUES,
    preferredVenue: "binance",
    winRate: 61.2,
    pnlPercent: 55.1,
    maxDrawdownPct: -22.8,
    riskScore: 62,
    riskBand: "Elevated",
    status: "warming",
    availability: "in_training",
    accent: "purple",
    signals: ["Impulse detect", "Volatility bands", "Trail protection"],
    defaultLeverage: 7,
  },
  {
    id: "vault-guardian",
    name: "Vault Guardian",
    tagline: "Capital Preservation Core",
    blurb:
      "Defensive allocator prioritizing drawdown control and steady compounding. Scheduled for the next training cohort.",
    strategyId: "evolgo-consensus",
    supportedVenues: DEFAULT_VENUES,
    preferredVenue: "binance",
    winRate: 74.9,
    pnlPercent: 18.3,
    maxDrawdownPct: -8.6,
    riskScore: 22,
    riskBand: "Low",
    status: "paused",
    availability: "coming_soon",
    accent: "green",
    signals: ["Drawdown caps", "Inventory hedge", "Slow-compound mode"],
    defaultLeverage: 2,
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

/** Clamp leverage into platform bounds. */
export function clampLeverage(value: number): number {
  if (!Number.isFinite(value)) return FALLBACK_DEFAULT_LEVERAGE;
  return Math.min(MAX_LEVERAGE, Math.max(MIN_LEVERAGE, Math.round(value)));
}

/**
 * Resolve default leverage: agent override → bound strategy → platform fallback.
 */
export function resolveDefaultLeverage(
  agent: Pick<AgentDefinition, "defaultLeverage" | "strategyId">,
  strategyDefault?: number | null,
): number {
  if (agent.defaultLeverage != null && agent.defaultLeverage > 0) {
    return clampLeverage(agent.defaultLeverage);
  }
  if (strategyDefault != null && strategyDefault > 0) {
    return clampLeverage(strategyDefault);
  }
  return FALLBACK_DEFAULT_LEVERAGE;
}
