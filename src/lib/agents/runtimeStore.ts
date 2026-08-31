/**
 * In-memory agent+strategy runtime for /api/v1 stubs (dev / sandbox).
 * Isolation key: `${agentId}::${strategyId}` so switching strategies is independent.
 */

import { getAgentById } from "@/config/agents";
import {
  getStrategyById,
  resolveStrategyId,
  type StrategyDefinition,
} from "@/config/strategies";

export type AgentRunStatus = "live" | "stopped";

export type ActivePosition = {
  id: string;
  pair: string;
  side: "Long" | "Short";
  entry: string;
  size: string;
  pnl_pct: number;
  status: "Open" | "Partial";
};

export type AgentRuntimeState = {
  agentId: string;
  strategyId: string;
  status: AgentRunStatus;
  cumulativePnlPct: number;
  activePositions: ActivePosition[];
  latencyMs: number;
  execSpeed: number;
  tick: number;
  updatedAt: string;
};

const g = globalThis as typeof globalThis & {
  __evolgoAgentRuntimeV3?: Map<string, AgentRuntimeState>;
};

function store(): Map<string, AgentRuntimeState> {
  if (!g.__evolgoAgentRuntimeV3) {
    g.__evolgoAgentRuntimeV3 = new Map();
  }
  return g.__evolgoAgentRuntimeV3;
}

export function runtimeKey(agentId: string, strategyId: string): string {
  return `${agentId}::${resolveStrategyId(strategyId)}`;
}

function strategyOrThrow(strategyId: string): StrategyDefinition {
  const s = getStrategyById(resolveStrategyId(strategyId));
  if (!s) throw new Error("Unknown strategy");
  return s;
}

function seedState(agentId: string, strategyId: string): AgentRuntimeState {
  const strategy = strategyOrThrow(strategyId);
  return {
    agentId,
    strategyId: strategy.id,
    status: "stopped",
    cumulativePnlPct: strategy.telemetry.basePnl,
    activePositions: [],
    latencyMs: 34 + strategy.telemetry.latencyBias,
    execSpeed: 0,
    tick: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getOrCreateRuntime(
  agentId: string,
  strategyId: string,
): AgentRuntimeState {
  const sid = resolveStrategyId(strategyId);
  const key = runtimeKey(agentId, sid);
  const map = store();
  let state = map.get(key);
  if (!state) {
    state = seedState(agentId, sid);
    map.set(key, state);
  }
  return state;
}

/** Advance live telemetry slightly on each metrics poll (strategy-isolated). */
export function tickRuntime(
  agentId: string,
  strategyId: string,
): AgentRuntimeState {
  const strategy = strategyOrThrow(strategyId);
  const state = getOrCreateRuntime(agentId, strategy.id);
  state.tick += 1;
  state.latencyMs =
    26 +
    strategy.telemetry.latencyBias +
    Math.floor(Math.random() * 34);
  state.updatedAt = new Date().toISOString();

  const vol = strategy.telemetry.volatility;

  if (state.status === "live") {
    state.execSpeed = 85 + Math.floor(Math.random() * 95);
    const drift = (Math.random() - 0.42) * vol;
    state.cumulativePnlPct = Number(
      (state.cumulativePnlPct + drift).toFixed(2),
    );
    state.activePositions = state.activePositions.map((pos, idx) => {
      const delta = (Math.random() - 0.45) * vol * (idx % 2 === 0 ? 1 : 1.4);
      return {
        ...pos,
        pnl_pct: Number((pos.pnl_pct + delta).toFixed(2)),
      };
    });
  } else {
    state.execSpeed = 0;
  }

  store().set(runtimeKey(agentId, strategy.id), state);
  return cloneState(state);
}

export function startAgent(
  agentId: string,
  strategyId: string,
): AgentRuntimeState {
  const strategy = strategyOrThrow(strategyId);
  const state = getOrCreateRuntime(agentId, strategy.id);
  if (state.status === "live") return tickRuntime(agentId, strategy.id);

  state.status = "live";
  state.execSpeed = 110 + Math.floor(Math.random() * 40);
  if (state.activePositions.length === 0) {
    state.activePositions = strategy.telemetry.positions.map((p) => ({
      ...p,
    }));
  }
  state.updatedAt = new Date().toISOString();
  store().set(runtimeKey(agentId, strategy.id), state);
  return tickRuntime(agentId, strategy.id);
}

export function stopAgent(
  agentId: string,
  strategyId: string,
): AgentRuntimeState {
  const strategy = strategyOrThrow(strategyId);
  const state = getOrCreateRuntime(agentId, strategy.id);
  state.status = "stopped";
  state.execSpeed = 0;
  state.activePositions = [];
  state.updatedAt = new Date().toISOString();
  store().set(runtimeKey(agentId, strategy.id), state);
  return cloneState(state);
}

export type BacktestResult = {
  window: string;
  strategy_id: string;
  trades: number;
  win_rate_pct: number;
  pnl_pct: number;
  max_drawdown_pct: number;
  sharpe: number;
  duration_ms: number;
};

export async function runBacktestStub(
  agentId: string,
  strategyId: string,
  window = "30D",
): Promise<BacktestResult> {
  const catalog = getAgentById(agentId);
  const strategy = strategyOrThrow(strategyId);
  const delayMs = 900 + Math.floor(Math.random() * 700);
  await new Promise((r) => setTimeout(r, delayMs));

  const aggressive = strategy.id === "evolgo-pump-hunter";
  const baseWin = (catalog?.winRate ?? 62) + (aggressive ? -4 : 2);
  const basePnl =
    strategy.telemetry.basePnl * (aggressive ? 1.35 : 1) +
    (catalog?.pnlPercent ?? 20) * 0.08;
  const noise = () => (Math.random() - 0.5) * (aggressive ? 6 : 3.5);

  return {
    window,
    strategy_id: strategy.id,
    trades: aggressive
      ? 40 + Math.floor(Math.random() * 55)
      : 24 + Math.floor(Math.random() * 36),
    win_rate_pct: Number((baseWin + noise() * 0.35).toFixed(1)),
    pnl_pct: Number((basePnl + noise()).toFixed(2)),
    max_drawdown_pct: Number(
      ((aggressive ? 4.2 : 2.1) + Math.random() * (aggressive ? 5.5 : 3.2)).toFixed(
        2,
      ),
    ),
    sharpe: Number(
      ((aggressive ? 0.95 : 1.15) + Math.random() * 0.95).toFixed(2),
    ),
    duration_ms: delayMs,
  };
}

function cloneState(state: AgentRuntimeState): AgentRuntimeState {
  return {
    ...state,
    activePositions: state.activePositions.map((p) => ({ ...p })),
  };
}

export function metricsPayload(state: AgentRuntimeState) {
  return {
    ok: true as const,
    agentId: state.agentId,
    strategy: state.strategyId,
    strategy_id: state.strategyId,
    status: state.status,
    cumulative_pnl_pct: state.cumulativePnlPct,
    active_positions: state.activePositions,
    latency_ms: state.latencyMs,
    exec_speed: state.execSpeed,
    tick: state.tick,
    updated_at: state.updatedAt,
  };
}
