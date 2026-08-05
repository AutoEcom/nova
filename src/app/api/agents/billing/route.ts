import { NextResponse } from "next/server";
import { AGENT_CATALOG, getAgentById } from "@/config/agents";
import {
  listBillingSubscriptionsForWallet,
  setSubscriptionAutoRenew,
} from "@/lib/agents/registry";

export const runtime = "nodejs";

function daysRemaining(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * GET /api/agents/billing?address=erd1...
 * POST { address, subscriptionId, autoRenew }
 */
export async function GET(request: Request) {
  try {
    const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
    if (!/^erd1[a-z0-9]{58}$/i.test(address)) {
      return NextResponse.json(
        { ok: false, error: "Valid MultiversX address required" },
        { status: 400 },
      );
    }

    const rows = await listBillingSubscriptionsForWallet(address);
    const now = Date.now();

    const active = rows
      .filter(
        (r) => r.status === "active" && new Date(r.expiresAt).getTime() > now,
      )
      .map((r) => ({
        ...r,
        agentName: getAgentById(r.agentId)?.name ?? r.agentId,
        daysRemaining: daysRemaining(r.expiresAt),
      }));

    // Free agents shown as complimentary access in the billing UI.
    const freeAgents = AGENT_CATALOG.filter((a) => a.freeAccess).map((a) => ({
      agentId: a.id,
      agentName: a.name,
      status: "active" as const,
      paymentAsset: "FREE" as const,
      daysRemaining: null as number | null,
      autoRenew: false,
      complimentary: true,
    }));

    const history = rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      agentName: getAgentById(r.agentId)?.name ?? r.agentId,
      date: r.createdAt,
      amount: r.amountPaid,
      asset: r.paymentAsset,
      status: r.status,
      txHash: r.paymentTxHash,
    }));

    return NextResponse.json({
      ok: true,
      address,
      active: [...freeAgents, ...active],
      history,
    });
  } catch (err) {
    console.error("[agents/billing]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Billing lookup failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      subscriptionId?: string;
      autoRenew?: boolean;
    };
    const address = body.address?.trim() ?? "";
    const subscriptionId = body.subscriptionId?.trim() ?? "";
    if (!/^erd1[a-z0-9]{58}$/i.test(address) || !subscriptionId) {
      return NextResponse.json(
        { ok: false, error: "address and subscriptionId required" },
        { status: 400 },
      );
    }
    if (typeof body.autoRenew !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "autoRenew boolean required" },
        { status: 400 },
      );
    }

    const updated = await setSubscriptionAutoRenew({
      walletAddress: address,
      subscriptionId,
      autoRenew: body.autoRenew,
    });

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (err) {
    console.error("[agents/billing POST]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to update billing",
      },
      { status: 500 },
    );
  }
}
