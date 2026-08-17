/**
 * Trading strategy catalog for the Evolgo command center.
 * Agent marketplace entries (Nova Regressors, …) host one of these strategies.
 */

export type StrategyStatus = "live" | "beta" | "coming_soon";

export type StrategyDefinition = {
  id: string;
  /** Display / class-style name shown in the selector */
  name: string;
  blurb: string;
  status: StrategyStatus;
  /** Seed for stub telemetry isolation */
  telemetry: {
    basePnl: number;
    volatility: number;
    latencyBias: number;
    positions: Array<{
      id: string;
      pair: string;
      side: "Long" | "Short";
      entry: string;
      size: string;
      pnl_pct: number;
      status: "Open" | "Partial";
    }>;
  };
};

export const DEFAULT_STRATEGY_ID = "evolgo-consensus";

export const STRATEGY_CATALOG: readonly StrategyDefinition[] = [
  {
    id: "evolgo-consensus",
    name: "EvolgoConsensusStrategy",
    blurb: "Multi-signal consensus · mean reversion + microstructure filters",
    status: "live",
    telemetry: {
      basePnl: 9.4,
      volatility: 0.28,
      latencyBias: 0,
      positions: [
        {
          id: "c1",
          pair: "EGLD/USDC",
          side: "Long",
          entry: "18.42",
          size: "1.250",
          pnl_pct: 2.84,
          status: "Open",
        },
        {
          id: "c2",
          pair: "NOVA/USDC",
          side: "Long",
          entry: "0.0102",
          size: "48,500",
          pnl_pct: 1.36,
          status: "Open",
        },
        {
          id: "c3",
          pair: "USDC/WEGLD",
          side: "Short",
          entry: "0.0541",
          size: "920",
          pnl_pct: -0.42,
          status: "Partial",
        },
      ],
    },
  },
  {
    id: "evolgo-pump-hunter",
    name: "EvolgoPumpHunter",
    blurb: "Impulse / breakout hunter · short-lived momentum bursts",
    status: "beta",
    telemetry: {
      basePnl: 14.8,
      volatility: 0.55,
      latencyBias: 8,
      positions: [
        {
          id: "h1",
          pair: "NOVA/USDC",
          side: "Long",
          entry: "0.0098",
          size: "72,000",
          pnl_pct: 4.12,
          status: "Open",
        },
        {
          id: "h2",
          pair: "EGLD/USDC",
          side: "Long",
          entry: "17.95",
          size: "2.100",
          pnl_pct: 3.05,
          status: "Open",
        },
        {
          id: "h3",
          pair: "WEGLD/USDC",
          side: "Short",
          entry: "18.60",
          size: "1.400",
          pnl_pct: -1.18,
          status: "Open",
        },
      ],
    },
  },
] as const;

export function getStrategyById(
  id: string,
): StrategyDefinition | undefined {
  return STRATEGY_CATALOG.find((s) => s.id === id);
}

export function resolveStrategyId(raw?: string | null): string {
  const id = raw?.trim() || DEFAULT_STRATEGY_ID;
  return getStrategyById(id) ? id : DEFAULT_STRATEGY_ID;
}
