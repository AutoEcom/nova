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
export type ExecutionMode = "dry_run" | "live";

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
  /** dry_run = simulation fills; live = armed for real order routing */
  mode: ExecutionMode;
  capitalUsd: number | null;
  /** Orchestrator session id when Live registration succeeded. */
  sessionId: string | null;
  /** Global futures leverage for the active run. */
  leverage: number | null;
  cumulativePnlPct: number;
  activePositions: ActivePosition[];
  latencyMs: number;
  execSpeed: number;
  tick: number;
  updatedAt: string;
};

const g = globalThis as typeof globalThis & {
  __evolgoAgentRuntimeV6?: Map<string, AgentRuntimeState>;
};

function store(): Map<string, AgentRuntimeState> {
  if (!g.__evolgoAgentRuntimeV6) {
    g.__evolgoAgentRuntimeV6 = new Map();
  }
  return g.__evolgoAgentRuntimeV6;
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
    mode: "dry_run",
    capitalUsd: null,
    sessionId: null,
    leverage: null,
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

/** Snapshot session/mode before stop clears them. */
export function peekRuntimeSession(
  agentId: string,
  strategyId: string,
): { mode: ExecutionMode; sessionId: string | null } {
  const state = getOrCreateRuntime(agentId, strategyId);
  return { mode: state.mode, sessionId: state.sessionId };
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
    // Dry Run: faster simulated ticks; Live: tighter latency bias (venue-ready stub)
    const speedBase = state.mode === "live" ? 70 : 95;
    const speedSpan = state.mode === "live" ? 60 : 90;
    state.execSpeed = speedBase + Math.floor(Math.random() * speedSpan);
    if (state.mode === "live") {
      state.latencyMs = Math.max(
        18,
        state.latencyMs - Math.floor(Math.random() * 4),
      );
    }
    const drift =
      (Math.random() - 0.42) * vol * (state.mode === "dry_run" ? 1.15 : 1);
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
  options: {
    mode?: ExecutionMode;
    capitalUsd?: number;
    sessionId?: string | null;
    leverage?: number | null;
  } = {},
): AgentRuntimeState {
  const strategy = strategyOrThrow(strategyId);
  const state = getOrCreateRuntime(agentId, strategy.id);
  const mode: ExecutionMode = options.mode === "live" ? "live" : "dry_run";
  state.mode = mode;
  if (
    typeof options.capitalUsd === "number" &&
    Number.isFinite(options.capitalUsd)
  ) {
    state.capitalUsd = options.capitalUsd;
  }
  if (options.sessionId !== undefined) {
    state.sessionId = options.sessionId;
  } else if (mode === "dry_run") {
    state.sessionId = null;
  }
  if (
    typeof options.leverage === "number" &&
    Number.isFinite(options.leverage)
  ) {
    state.leverage = options.leverage;
  }
  if (state.status === "live") return tickRuntime(agentId, strategy.id);

  state.status = "live";
  state.execSpeed =
    mode === "live"
      ? 95 + Math.floor(Math.random() * 35)
      : 120 + Math.floor(Math.random() * 45);
  if (state.activePositions.length === 0) {
    // Both modes seed stub inventory; Live marks readiness for real routing upstream
    state.activePositions = strategy.telemetry.positions.map((p) => ({
      ...p,
      size:
        mode === "dry_run" && !p.size.includes("SIM")
          ? `${p.size} · SIM`
          : p.size,
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
  state.sessionId = null;
  state.leverage = null;
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
    mode: state.mode,
    capital_usd: state.capitalUsd,
    session_id: state.sessionId,
    leverage: state.leverage,
    cumulative_pnl_pct: state.cumulativePnlPct,
    active_positions: state.activePositions,
    latency_ms: state.latencyMs,
    exec_speed: state.execSpeed,
    tick: state.tick,
    updated_at: state.updatedAt,
  };
}
