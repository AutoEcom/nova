import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import {
  OrchestratorError,
  stopLiveSession,
} from "@/lib/agents/orchestratorClient";
import {
  metricsPayload,
  peekRuntimeSession,
  stopAgent,
} from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/stop  { agentId, strategy?, mode?, sessionId? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      strategy?: string;
      strategyId?: string;
      mode?: "dry_run" | "live";
      sessionId?: string;
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

    const peek = peekRuntimeSession(agentId, strategy);
    const mode =
      body.mode === "live" || body.mode === "dry_run"
        ? body.mode
        : peek.mode;
    const sessionId =
      body.sessionId?.trim() || peek.sessionId || null;

    let orchestratorStopped = false;
    let warning: string | null = null;

    // Live — attempt orchestrator stop first; never block local stub stop.
    if (mode === "live") {
      if (!sessionId) {
        warning = "No live sessionId · stub stopped only";
      } else {
        try {
          await stopLiveSession(sessionId);
          orchestratorStopped = true;
        } catch (err) {
          const detail =
            err instanceof OrchestratorError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Unknown orchestrator error";
          console.error("[v1/agent/stop] orchestrator", detail);
          warning = detail;
        }
      }
    }

    const state = stopAgent(agentId, strategy);
    const modeLabel = mode === "live" ? "LIVE" : "DRY RUN";

    return NextResponse.json({
      ...metricsPayload(state),
      orchestratorStopped,
      warning,
      message: orchestratorStopped
        ? `Agent stopped · ${modeLabel} · session ${sessionId} · orchestrator halted`
        : warning
          ? `Agent stopped · ${modeLabel} · local stub · ${warning}`
          : `Agent stopped · ${modeLabel} · ${strategy}`,
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
