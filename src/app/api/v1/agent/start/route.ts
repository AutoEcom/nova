import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import { metricsPayload, startAgent } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/start  { agentId, strategy?, mode?, capitalUsd? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      strategy?: string;
      strategyId?: string;
      mode?: "dry_run" | "live";
      capitalUsd?: number;
    };
    const agentId = body.agentId?.trim() ?? "";
    const strategy = resolveStrategyId(body.strategy ?? body.strategyId);
    const mode = body.mode === "live" ? "live" : "dry_run";

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

    const capitalUsd =
      typeof body.capitalUsd === "number" && Number.isFinite(body.capitalUsd)
        ? body.capitalUsd
        : undefined;
    const state = startAgent(agentId, strategy, { mode, capitalUsd });
    const modeLabel = mode === "live" ? "LIVE" : "DRY RUN";
    const capitalPart =
      capitalUsd != null ? ` · $${capitalUsd.toLocaleString()} capital` : "";
    return NextResponse.json({
      ...metricsPayload(state),
      message: `Agent started · ${modeLabel} · ${strategy}${capitalPart}`,
    });
  } catch (err) {
    console.error("[v1/agent/start]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to start agent",
      },
      { status: 500 },
    );
  }
}
