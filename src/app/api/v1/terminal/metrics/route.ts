import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import {
  metricsPayload,
  tickRuntime,
} from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/**
 * GET /api/v1/terminal/metrics?agentId=…&strategy=evolgo-consensus
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId")?.trim() ?? "";
    const strategy = resolveStrategyId(
      searchParams.get("strategy") ?? searchParams.get("strategyId"),
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

    const state = tickRuntime(agentId, strategy);
    return NextResponse.json(metricsPayload(state));
  } catch (err) {
    console.error("[v1/terminal/metrics]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Metrics unavailable",
      },
      { status: 500 },
    );
  }
}
