/** Client helpers for Evolgo terminal /api/v1 stubs. */

import { DEFAULT_STRATEGY_ID } from "@/config/strategies";

export type TerminalStatus = "live" | "stopped";

export type TerminalPosition = {
  id: string;
  pair: string;
  side: "Long" | "Short";
  entry: string;
  size: string;
  pnl_pct: number;
  status: "Open" | "Partial" | "Filled" | "Closed";
};

export type TerminalMetrics = {
  ok: boolean;
  agentId: string;
  strategy?: string;
  strategy_id?: string;
  status: TerminalStatus;
  mode?: "dry_run" | "live";
  capital_usd?: number | null;
  session_id?: string | null;
  sessionId?: string | null;
  leverage?: number | null;
  cumulative_pnl_pct: number;
  active_positions: TerminalPosition[];
  latency_ms: number;
  exec_speed: number;
  tick: number;
  updated_at?: string;
  error?: string;
};

export type BacktestResult = {
  window: string;
  strategy_id?: string;
  trades: number;
  win_rate_pct: number;
  pnl_pct: number;
  max_drawdown_pct: number;
  sharpe: number;
  duration_ms: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** BFF SSE URL for Live session events. */
export function agentEventsUrl(sessionId: string): string {
  const qs = new URLSearchParams({ sessionId: sessionId.trim() });
  return `/api/v1/agent/events?${qs.toString()}`;
}

type OrchestratorPositionRaw = {
  tradeId?: number | string;
  pair?: string;
  side?: string;
  entry?: number | string;
  amount?: number | string;
  stake?: number | string;
  pnlPct?: number;
  hasOpenOrders?: boolean;
  isOpen?: boolean;
};

function formatEntry(value: number | string | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n >= 100 ? n.toFixed(2) : n.toPrecision(6);
}

function formatSize(
  amount: number | string | undefined,
  stake: number | string | undefined,
): string {
  if (amount != null && amount !== "") {
    const n = typeof amount === "number" ? amount : Number(amount);
    if (Number.isFinite(n)) return String(n);
    return String(amount);
  }
  if (stake != null && stake !== "") {
    const n = typeof stake === "number" ? stake : Number(stake);
    if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
    return String(stake);
  }
  return "—";
}

/** Map orchestrator position rows into terminal table rows. */
export function mapOrchestratorPositions(
  rows: OrchestratorPositionRaw[],
): TerminalPosition[] {
  return rows
    .filter((row) => row.isOpen !== false)
    .map((row, idx) => {
      const sideRaw = (row.side ?? "").toLowerCase();
      const side: "Long" | "Short" =
        sideRaw === "short" || sideRaw === "sell" ? "Short" : "Long";
      return {
        id: String(row.tradeId ?? `pos-${idx}`),
        pair: row.pair?.trim() || "—",
        side,
        entry: formatEntry(row.entry),
        size: formatSize(row.amount, row.stake),
        pnl_pct:
          typeof row.pnlPct === "number" && Number.isFinite(row.pnlPct)
            ? row.pnlPct
            : 0,
        status: row.hasOpenOrders ? "Partial" : "Open",
      };
    });
}

/** Fetch Live positions via BFF proxy. Returns null on failure (caller keeps snapshot). */
export async function fetchAgentPositions(
  sessionId: string,
  signal?: AbortSignal,
): Promise<TerminalPosition[] | null> {
  try {
    const qs = new URLSearchParams({ sessionId: sessionId.trim() });
    const res = await fetch(`/api/v1/agent/positions?${qs.toString()}`, {
      cache: "no-store",
      signal,
    });
    const json = await parseJson<{
      ok?: boolean;
      positions?: TerminalPosition[];
      error?: string;
    }>(res);
    if (!res.ok || !json.ok || !Array.isArray(json.positions)) return null;
    return json.positions;
  } catch {
    return null;
  }
}

export async function fetchTerminalMetrics(
  agentId: string,
  strategy: string = DEFAULT_STRATEGY_ID,
  signal?: AbortSignal,
): Promise<TerminalMetrics | null> {
  try {
    const qs = new URLSearchParams({
      agentId,
      strategy,
    });
    const res = await fetch(`/api/v1/terminal/metrics?${qs.toString()}`, {
      cache: "no-store",
      signal,
    });
    const json = await parseJson<TerminalMetrics & { error?: string }>(res);
    if (!res.ok || !json.ok) return null;
    return json;
  } catch {
    return null;
  }
}

export async function postAgentStart(
  agentId: string,
  strategy: string = DEFAULT_STRATEGY_ID,
  options: {
    mode?: "dry_run" | "live";
    capitalUsd?: number;
    walletAddress?: string | null;
    leverage?: number;
  } = {},
): Promise<TerminalMetrics & { message?: string; sessionId?: string }> {
  const res = await fetch("/api/v1/agent/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      strategy,
      mode: options.mode ?? "dry_run",
      capitalUsd: options.capitalUsd,
      walletAddress: options.walletAddress ?? undefined,
      leverage: options.leverage,
    }),
  });
  const json = await parseJson<
    TerminalMetrics & {
      message?: string;
      error?: string;
      sessionId?: string;
    }
  >(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Failed to start agent");
  }
  return json;
}

export async function postAgentStop(
  agentId: string,
  strategy: string = DEFAULT_STRATEGY_ID,
  options: {
    mode?: "dry_run" | "live";
    sessionId?: string | null;
  } = {},
): Promise<
  TerminalMetrics & {
    message?: string;
    warning?: string | null;
    orchestratorStopped?: boolean;
  }
> {
  const res = await fetch("/api/v1/agent/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      strategy,
      mode: options.mode,
      sessionId: options.sessionId ?? undefined,
    }),
  });
  const json = await parseJson<
    TerminalMetrics & {
      message?: string;
      error?: string;
      warning?: string | null;
      orchestratorStopped?: boolean;
    }
  >(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Failed to stop agent");
  }
  return json;
}

export async function postAgentBacktest(
  agentId: string,
  strategy: string = DEFAULT_STRATEGY_ID,
  options: {
    window?: string;
    from?: string;
    to?: string;
    capitalUsd?: number;
    mode?: "dry_run" | "live";
  } = {},
): Promise<{ ok: true; result: BacktestResult; message?: string }> {
  const res = await fetch("/api/v1/agent/backtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      strategy,
      window: options.window,
      from: options.from,
      to: options.to,
      capitalUsd: options.capitalUsd,
      mode: options.mode,
    }),
  });
  const json = await parseJson<{
    ok?: boolean;
    result?: BacktestResult;
    message?: string;
    error?: string;
  }>(res);
  if (!res.ok || !json.ok || !json.result) {
    throw new Error(json.error ?? "Backtest failed");
  }
  return { ok: true, result: json.result, message: json.message };
}
