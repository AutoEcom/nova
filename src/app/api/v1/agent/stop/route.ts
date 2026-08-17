import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { metricsPayload, stopAgent } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/stop  { agentId } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { agentId?: string };
    const agentId = body.agentId?.trim() ?? "";
    if (!agentId || !getAgentById(agentId)) {
      return NextResponse.json(
        { ok: false, error: "Valid agentId required" },
        { status: 400 },
      );
    }

    const state = stopAgent(agentId);
    return NextResponse.json({
      ...metricsPayload(state),
      message: "Agent stopped",
    });
  } catch (err) {
    console.error("[v1/agent/stop]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to stop agent",
      },
      { status: 500 },
    );
  }
}
