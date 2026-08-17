import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { metricsPayload, startAgent } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/start  { agentId } */
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

    const state = startAgent(agentId);
    return NextResponse.json({
      ...metricsPayload(state),
      message: "Agent started",
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
