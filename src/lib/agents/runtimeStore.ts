/**
 * In-memory agent runtime for /api/v1 stubs (dev / sandbox).
 * Shared across route handlers in the same Node process.
 */

import { getAgentById } from "@/config/agents";

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
  status: AgentRunStatus;
  cumulativePnlPct: number;
  activePositions: ActivePosition[];
  latencyMs: number;
  execSpeed: number;
  tick: number;
  updatedAt: string;
};

const DEFAULT_POSITIONS: ActivePosition[] = [
  {
    id: "p1",
    pair: "EGLD/USDC",
    side: "Long",
    entry: "18.42",
    size: "1.250",
    pnl_pct: 2.84,
    status: "Open",
  },
  {
    id: "p2",
    pair: "NOVA/USDC",
    side: "Long",
    entry: "0.0102",
    size: "48,500",
    pnl_pct: 1.36,
    status: "Open",
  },
  {
    id: "p3",
    pair: "USDC/WEGLD",
    side: "Short",
    entry: "0.0541",
    size: "920",
    pnl_pct: -0.42,
    status: "Partial",
  },
];

const g = globalThis as typeof globalThis & {
  __evolgoAgentRuntime?: Map<string, AgentRuntimeState>;
};

function store(): Map<string, AgentRuntimeState> {
  if (!g.__evolgoAgentRuntime) {
    g.__evolgoAgentRuntime = new Map();
  }
  return g.__evolgoAgentRuntime;
}

function seedState(agentId: string): AgentRuntimeState {
  const catalog = getAgentById(agentId);
  return {
    agentId,
    status: "stopped",
    cumulativePnlPct: catalog?.pnlPercent
      ? Number((catalog.pnlPercent * 0.18).toFixed(2))
      : 8.4,
    activePositions: [],
    latencyMs: 38,
    execSpeed: 0,
    tick: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getOrCreateRuntime(agentId: string): AgentRuntimeState {
  const map = store();
  let state = map.get(agentId);
  if (!state) {
    state = seedState(agentId);
    map.set(agentId, state);
  }
  return state;
}

/** Advance live telemetry slightly on each metrics poll. */
export function tickRuntime(agentId: string): AgentRuntimeState {
  const state = getOrCreateRuntime(agentId);
  state.tick += 1;
  state.latencyMs = 28 + Math.floor(Math.random() * 36);
  state.updatedAt = new Date().toISOString();

  if (state.status === "live") {
    state.execSpeed = 90 + Math.floor(Math.random() * 90);
    const drift = (Math.random() - 0.42) * 0.35;
    state.cumulativePnlPct = Number(
      (state.cumulativePnlPct + drift).toFixed(2),
    );
    state.activePositions = state.activePositions.map((pos, idx) => {
      const delta = (Math.random() - 0.45) * (idx % 2 === 0 ? 0.28 : 0.48);
      return {
        ...pos,
        pnl_pct: Number((pos.pnl_pct + delta).toFixed(2)),
      };
    });
  } else {
    state.execSpeed = 0;
  }

  store().set(agentId, state);
  return { ...state, activePositions: state.activePositions.map((p) => ({ ...p })) };
}

export function startAgent(agentId: string): AgentRuntimeState {
  const state = getOrCreateRuntime(agentId);
  if (state.status === "live") return tickRuntime(agentId);

  state.status = "live";
  state.execSpeed = 110 + Math.floor(Math.random() * 40);
  if (state.activePositions.length === 0) {
    state.activePositions = DEFAULT_POSITIONS.map((p) => ({ ...p }));
  }
  state.updatedAt = new Date().toISOString();
  store().set(agentId, state);
  return tickRuntime(agentId);
}

export function stopAgent(agentId: string): AgentRuntimeState {
  const state = getOrCreateRuntime(agentId);
  state.status = "stopped";
  state.execSpeed = 0;
  state.updatedAt = new Date().toISOString();
  store().set(agentId, state);
  return {
    ...state,
    activePositions: state.activePositions.map((p) => ({ ...p })),
  };
}

export type BacktestResult = {
  window: string;
  trades: number;
  win_rate_pct: number;
  pnl_pct: number;
  max_drawdown_pct: number;
  sharpe: number;
  duration_ms: number;
};

export async function runBacktestStub(
  agentId: string,
  window = "30D",
): Promise<BacktestResult> {
  const catalog = getAgentById(agentId);
  const delayMs = 900 + Math.floor(Math.random() * 700);
  await new Promise((r) => setTimeout(r, delayMs));

  const baseWin = catalog?.winRate ?? 62;
  const basePnl = catalog?.pnlPercent ?? 22;
  const noise = () => (Math.random() - 0.5) * 4;

  return {
    window,
    trades: 28 + Math.floor(Math.random() * 40),
    win_rate_pct: Number((baseWin + noise() * 0.4).toFixed(1)),
    pnl_pct: Number((basePnl * 0.22 + noise()).toFixed(2)),
    max_drawdown_pct: Number((2.4 + Math.random() * 3.8).toFixed(2)),
    sharpe: Number((1.05 + Math.random() * 0.9).toFixed(2)),
    duration_ms: delayMs,
  };
}

export function metricsPayload(state: AgentRuntimeState) {
  return {
    ok: true as const,
    agentId: state.agentId,
    status: state.status,
    cumulative_pnl_pct: state.cumulativePnlPct,
    active_positions: state.activePositions,
    latency_ms: state.latencyMs,
    exec_speed: state.execSpeed,
    tick: state.tick,
    updated_at: state.updatedAt,
  };
}
