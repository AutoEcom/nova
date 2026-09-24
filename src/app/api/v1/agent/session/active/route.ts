import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import {
  OrchestratorError,
  fetchActiveSessions,
} from "@/lib/agents/orchestratorClient";
import {
  getOrCreateRuntime,
  metricsPayload,
  startAgent,
} from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agent/session/active?agentId=&strategyId=
 * Recover a Live orchestrator session into local runtimeStore when present.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId")?.trim() ?? "";
  const strategy = resolveStrategyId(
    searchParams.get("strategyId") ?? searchParams.get("strategy"),
  );

  if (!agentId || !getAgentById(agentId)) {
    return NextResponse.json(
      { ok: false, error: "Valid agentId required" },
      { status: 400 },
    );
  }
  if (!getStrategyById(strategy)) {
    return NextResponse.json(
      { ok: false, error: "Unknown strategy" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchActiveSessions(
      { agentId, strategyId: strategy },
      request.signal,
    );

    if (!result.sessions.length) {
      return NextResponse.json({
        ok: true,
        recovered: false,
        session: null,
      });
    }

    // Prefer newest by registeredAt when available.
    const sorted = [...result.sessions].sort((a, b) => {
      const ta = a.registeredAt ? Date.parse(a.registeredAt) : 0;
      const tb = b.registeredAt ? Date.parse(b.registeredAt) : 0;
      return tb - ta;
    });
    const session = sorted[0]!;
    const capitalUsd =
      typeof session.capitalUsd === "number" && Number.isFinite(session.capitalUsd)
        ? session.capitalUsd
        : undefined;

    startAgent(agentId, strategy, {
      mode: "live",
      sessionId: session.sessionId,
      capitalUsd,
    });

    // Don't seed stub inventory — Live positions poll fills real rows.
    const runtime = getOrCreateRuntime(agentId, strategy);
    runtime.activePositions = [];
    runtime.mode = "live";
    runtime.sessionId = session.sessionId;
    runtime.status = "live";
    if (capitalUsd != null) runtime.capitalUsd = capitalUsd;

    const { ok: _metricsOk, ...metrics } = metricsPayload(runtime);

    return NextResponse.json({
      ok: true,
      recovered: true,
      session: {
        sessionId: session.sessionId,
        agentId: session.agentId ?? agentId,
        strategyId: session.strategyId ?? strategy,
        capitalUsd: capitalUsd ?? null,
        status: session.status ?? "registered",
        registeredAt: session.registeredAt ?? null,
        walletAddress: session.walletAddress ?? null,
      },
      ...metrics,
    });
  } catch (err) {
    // Soft-fail: terminal stays on Dry Run default.
    if (err instanceof OrchestratorError) {
      console.error("[v1/agent/session/active]", err.message);
      return NextResponse.json({
        ok: true,
        recovered: false,
        session: null,
        warning: err.message,
      });
    }
    console.error("[v1/agent/session/active]", err);
    return NextResponse.json({
      ok: true,
      recovered: false,
      session: null,
      warning:
        err instanceof Error ? err.message : "Active session lookup failed",
    });
  }
}
