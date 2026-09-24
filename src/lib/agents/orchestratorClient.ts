/**
 * Server-only client for the Evolgo orchestrator (Contabo backend).
 * Live session register / stop — no order routing yet.
 */

export type RegisterLiveSessionInput = {
  agentId: string;
  strategyId: string;
  capitalUsd: number;
  walletAddress?: string | null;
  /** Global futures leverage for the session (Phase 1). */
  leverage?: number;
  venue?: {
    exchange?: "binance" | "okx";
    market?: "futures" | "spot";
    keysRegistered?: boolean;
  };
  risk?: {
    maxDrawdownPct?: number | null;
    riskScore?: number | null;
  };
  requestId?: string;
};

export type RegisterLiveSessionResult = {
  ok: true;
  sessionId: string;
  status: string;
  ordersEnabled: boolean;
  agentId: string;
  strategyId: string;
  capitalUsd?: number;
  walletAddress?: string | null;
  registeredAt?: string;
  message?: string;
};

export class OrchestratorError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OrchestratorError";
    this.status = status;
  }
}

function orchestratorBaseUrl(): string {
  const raw = process.env.EVOLGO_ORCHESTRATOR_URL?.trim();
  if (!raw) {
    throw new OrchestratorError(
      "EVOLGO_ORCHESTRATOR_URL is not configured",
      503,
    );
  }
  return raw.replace(/\/$/, "");
}

/** Upstream SSE URL for a live session event stream. */
export function orchestratorSessionEventsUrl(sessionId: string): string {
  const id = sessionId.trim();
  if (!id) {
    throw new OrchestratorError("sessionId required for events stream", 400);
  }
  return `${orchestratorBaseUrl()}/v1/sessions/${encodeURIComponent(id)}/events`;
}

export async function registerLiveSession(
  input: RegisterLiveSessionInput,
): Promise<RegisterLiveSessionResult> {
  const base = orchestratorBaseUrl();
  const url = `${base}/v1/sessions/start`;
  const requestId =
    input.requestId?.trim() ||
    `nova_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    sessionKind: "live" as const,
    agentId: input.agentId,
    strategyId: input.strategyId,
    capitalUsd: input.capitalUsd,
    walletAddress: input.walletAddress?.trim() || null,
    leverage: {
      default:
        typeof input.leverage === "number" && Number.isFinite(input.leverage)
          ? Math.round(input.leverage)
          : 3,
    },
    venue: {
      exchange: input.venue?.exchange ?? "binance",
      market: input.venue?.market ?? "futures",
      keysRegistered: input.venue?.keysRegistered ?? true,
    },
    risk: {
      maxDrawdownPct: input.risk?.maxDrawdownPct ?? null,
      riskScore: input.risk?.riskScore ?? null,
    },
    client: {
      source: "nova-terminal",
      requestId,
    },
    execution: {
      ordersEnabled: false,
      intent: "register_session_only" as const,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "network error";
    throw new OrchestratorError(
      `Orchestrator unreachable · ${detail}`,
      503,
    );
  }

  let json: {
    ok?: boolean;
    sessionId?: string;
    status?: string;
    ordersEnabled?: boolean;
    agentId?: string;
    strategyId?: string;
    capitalUsd?: number;
    walletAddress?: string | null;
    registeredAt?: string;
    message?: string;
    error?: string;
    detail?: string | unknown;
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new OrchestratorError(
      `Orchestrator returned invalid JSON (HTTP ${res.status})`,
      502,
    );
  }

  if (!res.ok || !json.ok || !json.sessionId) {
    const detail =
      typeof json.error === "string"
        ? json.error
        : typeof json.detail === "string"
          ? json.detail
          : `HTTP ${res.status}`;
    throw new OrchestratorError(
      `Live session registration failed · ${detail}`,
      res.status >= 400 && res.status < 600 ? res.status : 502,
    );
  }

  return {
    ok: true,
    sessionId: json.sessionId,
    status: json.status ?? "registered",
    ordersEnabled: false,
    agentId: json.agentId ?? input.agentId,
    strategyId: json.strategyId ?? input.strategyId,
    capitalUsd: json.capitalUsd ?? input.capitalUsd,
    walletAddress: json.walletAddress ?? input.walletAddress ?? null,
    registeredAt: json.registeredAt,
    message: json.message,
  };
}

export type StopLiveSessionResult = {
  ok: true;
  sessionId: string;
  status: string;
  message?: string;
};

/** Stop a registered Live session on the Evolgo orchestrator. */
export async function stopLiveSession(
  sessionId: string,
): Promise<StopLiveSessionResult> {
  const id = sessionId.trim();
  if (!id) {
    throw new OrchestratorError("sessionId required to stop Live session", 400);
  }

  const base = orchestratorBaseUrl();
  const url = `${base}/v1/sessions/${encodeURIComponent(id)}/stop`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new OrchestratorError(
      `Orchestrator unreachable · ${detail}`,
      503,
    );
  }

  let json: {
    ok?: boolean;
    sessionId?: string;
    status?: string;
    message?: string;
    error?: string;
    detail?: string | unknown;
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new OrchestratorError(
      `Orchestrator returned invalid JSON (HTTP ${res.status})`,
      502,
    );
  }

  if (!res.ok || json.ok === false) {
    const detail =
      typeof json.error === "string"
        ? json.error
        : typeof json.detail === "string"
          ? json.detail
          : `HTTP ${res.status}`;
    throw new OrchestratorError(
      `Live session stop failed · ${detail}`,
      res.status >= 400 && res.status < 600 ? res.status : 502,
    );
  }

  return {
    ok: true,
    sessionId: json.sessionId ?? id,
    status: json.status ?? "stopped",
    message: json.message,
  };
}

export type OrchestratorLivePosition = {
  tradeId?: number | string;
  pair?: string;
  side?: string;
  entry?: number | string;
  amount?: number | string;
  stake?: number | string;
  pnlPct?: number;
  pnlAbs?: number;
  leverage?: number;
  isOpen?: boolean;
  openDate?: string;
  enterTag?: string;
  stopLoss?: number | string;
  hasOpenOrders?: boolean;
};

export type FetchLivePositionsResult = {
  sessionId: string;
  strategyId?: string;
  positions: OrchestratorLivePosition[];
  count: number;
  source?: string;
};

/** Fetch open positions for a Live session from the orchestrator. */
export async function fetchLiveSessionPositions(
  sessionId: string,
  signal?: AbortSignal,
): Promise<FetchLivePositionsResult> {
  const id = sessionId.trim();
  if (!id) {
    throw new OrchestratorError("sessionId required for positions", 400);
  }

  const url = `${orchestratorBaseUrl()}/v1/sessions/${encodeURIComponent(id)}/positions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      signal: signal ?? AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new OrchestratorError(
      `Orchestrator unreachable · ${detail}`,
      503,
    );
  }

  let json: {
    sessionId?: string;
    strategyId?: string;
    positions?: OrchestratorLivePosition[];
    count?: number;
    source?: string;
    ok?: boolean;
    error?: string;
    detail?: string | unknown;
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new OrchestratorError(
      `Orchestrator returned invalid JSON (HTTP ${res.status})`,
      502,
    );
  }

  if (!res.ok) {
    const detail =
      typeof json.error === "string"
        ? json.error
        : typeof json.detail === "string"
          ? json.detail
          : `HTTP ${res.status}`;
    throw new OrchestratorError(
      `Live positions failed · ${detail}`,
      res.status >= 400 && res.status < 600 ? res.status : 502,
    );
  }

  const positions = Array.isArray(json.positions) ? json.positions : [];
  return {
    sessionId: json.sessionId ?? id,
    strategyId: json.strategyId,
    positions,
    count: typeof json.count === "number" ? json.count : positions.length,
    source: json.source,
  };
}
