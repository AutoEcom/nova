import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { runBacktestStub } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/backtest  { agentId, window? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      window?: string;
    };
    const agentId = body.agentId?.trim() ?? "";
    if (!agentId || !getAgentById(agentId)) {
      return NextResponse.json(
        { ok: false, error: "Valid agentId required" },
        { status: 400 },
      );
    }

    const window = body.window?.trim() || "30D";
    const result = await runBacktestStub(agentId, window);

    return NextResponse.json({
      ok: true,
      agentId,
      message: "Backtest complete",
      result,
    });
  } catch (err) {
    console.error("[v1/agent/backtest]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Backtest failed",
      },
      { status: 500 },
    );
  }
}
