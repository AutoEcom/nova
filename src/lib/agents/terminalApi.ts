/** Client helpers for Evolgo terminal /api/v1 stubs. */

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
  status: TerminalStatus;
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

export async function fetchTerminalMetrics(
  agentId: string,
  signal?: AbortSignal,
): Promise<TerminalMetrics | null> {
  try {
    const res = await fetch(
      `/api/v1/terminal/metrics?agentId=${encodeURIComponent(agentId)}`,
      { cache: "no-store", signal },
    );
    const json = await parseJson<TerminalMetrics & { error?: string }>(res);
    if (!res.ok || !json.ok) return null;
    return json;
  } catch {
    return null;
  }
}

export async function postAgentStart(
  agentId: string,
): Promise<TerminalMetrics & { message?: string }> {
  const res = await fetch("/api/v1/agent/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  const json = await parseJson<
    TerminalMetrics & { message?: string; error?: string }
  >(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Failed to start agent");
  }
  return json;
}

export async function postAgentStop(
  agentId: string,
): Promise<TerminalMetrics & { message?: string }> {
  const res = await fetch("/api/v1/agent/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  const json = await parseJson<
    TerminalMetrics & { message?: string; error?: string }
  >(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Failed to stop agent");
  }
  return json;
}

export async function postAgentBacktest(
  agentId: string,
  window = "30D",
): Promise<{ ok: true; result: BacktestResult; message?: string }> {
  const res = await fetch("/api/v1/agent/backtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, window }),
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
