import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import { metricsPayload, startAgent } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/start  { agentId, strategy? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      strategy?: string;
      strategyId?: string;
    };
    const agentId = body.agentId?.trim() ?? "";
    const strategy = resolveStrategyId(body.strategy ?? body.strategyId);

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

    const state = startAgent(agentId, strategy);
    return NextResponse.json({
      ...metricsPayload(state),
      message: `Agent started · ${strategy}`,
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
