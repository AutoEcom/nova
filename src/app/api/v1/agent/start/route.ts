import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import { getStrategyById, resolveStrategyId } from "@/config/strategies";
import {
  OrchestratorError,
  registerLiveSession,
} from "@/lib/agents/orchestratorClient";
import { metricsPayload, startAgent } from "@/lib/agents/runtimeStore";

export const runtime = "nodejs";

/** POST /api/v1/agent/start  { agentId, strategy?, mode?, capitalUsd?, walletAddress? } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      strategy?: string;
      strategyId?: string;
      mode?: "dry_run" | "live";
      capitalUsd?: number;
      walletAddress?: string;
    };
    const agentId = body.agentId?.trim() ?? "";
    const strategy = resolveStrategyId(body.strategy ?? body.strategyId);
    const mode = body.mode === "live" ? "live" : "dry_run";
    const walletAddress = body.walletAddress?.trim() || null;

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

    // Dry Run — local stub only (unchanged behaviour).
    if (mode === "dry_run") {
      const state = startAgent(agentId, strategy, { mode, capitalUsd });
      const capitalPart =
        capitalUsd != null ? ` · $${capitalUsd.toLocaleString()} capital` : "";
      return NextResponse.json({
        ...metricsPayload(state),
        message: `Agent started · DRY RUN · ${strategy}${capitalPart}`,
      });
    }

    // Live — register session on Evolgo orchestrator first; fail closed.
    if (capitalUsd == null || capitalUsd <= 0) {
      return NextResponse.json(
        { ok: false, error: "capitalUsd required for Live start" },
        { status: 400 },
      );
    }

    const agent = getAgentById(agentId)!;
    let session;
    try {
      session = await registerLiveSession({
        agentId,
        strategyId: strategy,
        capitalUsd,
        walletAddress,
        venue: {
          exchange: "binance",
          market: "futures",
          keysRegistered: true,
        },
        risk: {
          maxDrawdownPct: agent.maxDrawdownPct,
          riskScore: agent.riskScore,
        },
      });
    } catch (err) {
      if (err instanceof OrchestratorError) {
        console.error("[v1/agent/start] orchestrator", err.message);
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: err.status },
        );
      }
      throw err;
    }

    // Only after successful registration — arm local UI telemetry.
    const state = startAgent(agentId, strategy, {
      mode: "live",
      capitalUsd,
      sessionId: session.sessionId,
    });

    return NextResponse.json({
      ...metricsPayload(state),
      sessionId: session.sessionId,
      message:
        session.message ??
        `Agent started · LIVE · session ${session.sessionId} · ${strategy} · $${capitalUsd.toLocaleString()} capital`,
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
