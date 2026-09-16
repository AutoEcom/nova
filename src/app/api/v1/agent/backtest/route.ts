import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import { runBacktestStub } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/backtest  { agentId, strategy?, window?, from?, to?, capitalUsd? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      strategy?: string;
      strategyId?: string;
      window?: string;
      from?: string;
      to?: string;
      capitalUsd?: number;
      mode?: string;
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

    const dateWindow =
      body.from && body.to
        ? `${body.from}→${body.to}`
        : body.window?.trim() || "30D";
    const result = await runBacktestStub(agentId, strategy, dateWindow);

    return NextResponse.json({
      ok: true,
      agentId,
      strategy,
      capitalUsd: body.capitalUsd ?? null,
      mode: body.mode ?? "dry_run",
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
