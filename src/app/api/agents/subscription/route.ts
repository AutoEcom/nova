import { NextResponse } from "next/server";
import { getAgentById, resolveAgentId } from "@/config/agents";
import {
  getActiveAgentSubscription,
  listActiveSubscriptionsForWallet,
} from "@/lib/agents/registry";
import {
  isSupabaseConfigured,
  mapSupabaseError,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/agents/subscription?address=erd1...&agentId=evolgo-adaptive-mtf
 * Without agentId → list all active subscriptions for the wallet.
 */
export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Subscription database not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.trim() ?? "";
    const agentIdRaw = searchParams.get("agentId")?.trim() ?? "";

    if (!/^erd1[a-z0-9]{58}$/i.test(address)) {
      return NextResponse.json(
        { ok: false, error: "Valid MultiversX address required" },
        { status: 400 },
      );
    }

    if (agentIdRaw) {
      const agentId = resolveAgentId(agentIdRaw);
      if (!getAgentById(agentId)) {
        return NextResponse.json(
          { ok: false, error: "Unknown agent" },
          { status: 404 },
        );
      }
      const sub = await getActiveAgentSubscription(address, agentId);
      return NextResponse.json({
        ok: true,
        address,
        agentId,
        active: Boolean(sub),
        subscription: sub,
      });
    }

    const list = await listActiveSubscriptionsForWallet(address);
    return NextResponse.json({
      ok: true,
      address,
      activeAgentIds: list.map((s) => s.agentId),
      subscriptions: list,
    });
  } catch (err) {
    console.error("[agents/subscription]", err);
    return NextResponse.json(
      {
        ok: false,
        error: mapSupabaseError(err, "Subscription lookup failed"),
      },
      { status: 500 },
    );
  }
}
