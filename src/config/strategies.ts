/**
 * Trading strategy catalog for Evolgo agent workspaces.
 * Each live agent binds to exactly one strategy (no in-terminal switching).
 */

/** Top 10 liquid Binance USD-M Futures pairs (Consensus default universe). */
export const BINANCE_TOP10_FUTURES = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "DOGE/USDT",
  "ADA/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  "DOT/USDT",
] as const;

export type BinanceFuturesPair = (typeof BINANCE_TOP10_FUTURES)[number];

export type StrategyStatus = "live" | "beta" | "coming_soon";

export type StrategyPositionSeed = {
  id: string;
  pair: BinanceFuturesPair | string;
  side: "Long" | "Short";
  entry: string;
  size: string;
  pnl_pct: number;
  status: "Open" | "Partial";
};

export type StrategyDefinition = {
  id: string;
  /** Orchestrator class / display name */
  name: string;
  blurb: string;
  status: StrategyStatus;
  /** Seed for stub telemetry isolation */
  telemetry: {
    basePnl: number;
    volatility: number;
    latencyBias: number;
    positions: StrategyPositionSeed[];
  };
};

export const DEFAULT_STRATEGY_ID = "evolgo-consensus";

const CONSENSUS_POSITIONS: StrategyPositionSeed[] = [
  {
    id: "c1",
    pair: "BTC/USDT",
    side: "Long",
    entry: "64,820",
    size: "0.085",
    pnl_pct: 1.42,
    status: "Open",
  },
  {
    id: "c2",
    pair: "ETH/USDT",
    side: "Long",
    entry: "3,412",
    size: "1.40",
    pnl_pct: 0.86,
    status: "Open",
  },
  {
    id: "c3",
    pair: "SOL/USDT",
    side: "Short",
    entry: "148.20",
    size: "28.0",
    pnl_pct: -0.54,
    status: "Open",
  },
  {
    id: "c4",
    pair: "BNB/USDT",
    side: "Long",
    entry: "592.40",
    size: "2.10",
    pnl_pct: 0.71,
    status: "Partial",
  },
  {
    id: "c5",
    pair: "XRP/USDT",
    side: "Long",
    entry: "0.612",
    size: "4,200",
    pnl_pct: 1.18,
    status: "Open",
  },
  {
    id: "c6",
    pair: "DOGE/USDT",
    side: "Short",
    entry: "0.128",
    size: "18,500",
    pnl_pct: -0.32,
    status: "Open",
  },
  {
    id: "c7",
    pair: "LINK/USDT",
    side: "Long",
    entry: "14.82",
    size: "95.0",
    pnl_pct: 2.04,
    status: "Open",
  },
  {
    id: "c8",
    pair: "AVAX/USDT",
    side: "Long",
    entry: "36.40",
    size: "42.0",
    pnl_pct: 0.48,
    status: "Open",
  },
];

const PUMP_HUNTER_POSITIONS: StrategyPositionSeed[] = [
  {
    id: "h1",
    pair: "SOL/USDT",
    side: "Long",
    entry: "142.10",
    size: "55.0",
    pnl_pct: 3.82,
    status: "Open",
  },
  {
    id: "h2",
    pair: "DOGE/USDT",
    side: "Long",
    entry: "0.119",
    size: "42,000",
    pnl_pct: 4.15,
    status: "Open",
  },
  {
    id: "h3",
    pair: "BNB/USDT",
    side: "Short",
    entry: "605.00",
    size: "3.20",
    pnl_pct: -1.28,
    status: "Open",
  },
  {
    id: "h4",
    pair: "ADA/USDT",
    side: "Long",
    entry: "0.448",
    size: "8,800",
    pnl_pct: 2.66,
    status: "Partial",
  },
];

export const STRATEGY_CATALOG: readonly StrategyDefinition[] = [
  {
    id: "evolgo-consensus",
    name: "EvolgoConsensusStrategy",
    blurb:
      "Multi-signal consensus across top-10 Binance Futures · mean reversion + microstructure filters",
    status: "live",
    telemetry: {
      basePnl: 9.4,
      volatility: 0.28,
      latencyBias: 0,
      positions: CONSENSUS_POSITIONS,
    },
  },
  {
    id: "evolgo-pump-hunter",
    name: "EvolgoPumpHunter",
    blurb: "Impulse / breakout hunter · short-lived momentum bursts",
    status: "coming_soon",
    telemetry: {
      basePnl: 14.8,
      volatility: 0.55,
      latencyBias: 8,
      positions: PUMP_HUNTER_POSITIONS,
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
