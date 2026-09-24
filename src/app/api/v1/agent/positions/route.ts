import { NextResponse } from "next/server";
import {
  OrchestratorError,
  fetchLiveSessionPositions,
} from "@/lib/agents/orchestratorClient";
import { mapOrchestratorPositions } from "@/lib/agents/terminalApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agent/positions?sessionId=…
 * Proxies Live session positions from the Evolgo orchestrator.
 */
export async function GET(request: Request) {
  const sessionId =
    new URL(request.url).searchParams.get("sessionId")?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "sessionId required" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchLiveSessionPositions(
      sessionId,
      request.signal,
    );
    const positions = mapOrchestratorPositions(result.positions);
    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      strategyId: result.strategyId ?? null,
      positions,
      count: positions.length,
      source: result.source ?? "runner",
    });
  } catch (err) {
    if (err instanceof OrchestratorError) {
      console.error("[v1/agent/positions]", err.message);
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[v1/agent/positions]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch positions",
      },
      { status: 500 },
    );
  }
}
