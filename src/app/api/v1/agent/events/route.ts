import { NextResponse } from "next/server";
import {
  OrchestratorError,
  orchestratorSessionEventsUrl,
} from "@/lib/agents/orchestratorClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agent/events?sessionId=…
 * Proxies the Evolgo orchestrator SSE stream to the browser (server-only URL).
 */
export async function GET(request: Request) {
  const sessionId =
    new URL(request.url).searchParams.get("sessionId")?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "sessionId required" },
      { status: 400 },
    );
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = orchestratorSessionEventsUrl(sessionId);
  } catch (err) {
    const message =
      err instanceof OrchestratorError
        ? err.message
        : "Orchestrator URL not configured";
    const status = err instanceof OrchestratorError ? err.status : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: request.signal,
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    console.error("[v1/agent/events] upstream fetch", detail);
    return NextResponse.json(
      { ok: false, error: `Orchestrator events unreachable · ${detail}` },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = `HTTP ${upstream.status}`;
    try {
      const json = (await upstream.json()) as { error?: string; detail?: string };
      detail = json.error ?? json.detail ?? detail;
    } catch {
      /* ignore */
    }
    console.error("[v1/agent/events] upstream", detail);
    return NextResponse.json(
      { ok: false, error: `Orchestrator events failed · ${detail}` },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
