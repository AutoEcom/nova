import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import {
  metricsPayload,
  tickRuntime,
} from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/**
 * GET /api/v1/terminal/metrics?agentId=nova-regressors
 * Stub telemetry for the Evolgo command center.
 */
export async function GET(request: Request) {
  try {
    const agentId =
      new URL(request.url).searchParams.get("agentId")?.trim() ?? "";
    if (!agentId || !getAgentById(agentId)) {
      return NextResponse.json(
        { ok: false, error: "Valid agentId required" },
        { status: 400 },
      );
    }

    const state = tickRuntime(agentId);
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
