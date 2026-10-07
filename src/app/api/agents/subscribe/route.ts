import { NextResponse } from "next/server";
import { getAgentById, resolveAgentId } from "@/config/agents";
import {
  activateAgentSubscription,
  findSubscriptionByPaymentTx,
  getActiveAgentSubscription,
} from "@/lib/agents/registry";
import type { AgentPaymentAsset } from "@/lib/agents/createSubscriptionPayment";
import { verifyAgentSubscriptionPayment } from "@/lib/agents/verifySubscriptionPayment";
import {
  isSupabaseConfigured,
  mapSupabaseError,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/agents/subscribe
 * Body: { address, agentId, asset: "USDC"|"NOVA", paymentTxHash }
 *
 * Idempotent: same paymentTxHash returns the existing row; valid new payments
 * always persist an active clearance for the wallet+agent.
 */
export async function POST(request: Request) {
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

    const body = (await request.json()) as {
      address?: string;
      agentId?: string;
      asset?: AgentPaymentAsset;
      paymentTxHash?: string;
    };

    const address = body.address?.trim() ?? "";
    const agentId = resolveAgentId(body.agentId?.trim() ?? "");
    const asset =
      body.asset === "NOVA" ? "NOVA" : body.asset === "USDC" ? "USDC" : null;
    const paymentTxHash = body.paymentTxHash?.trim() ?? "";

    if (!/^erd1[a-z0-9]{58}$/i.test(address)) {
      return NextResponse.json(
        { ok: false, error: "Valid MultiversX address required" },
        { status: 400 },
      );
    }
    if (!getAgentById(agentId)) {
      return NextResponse.json(
        { ok: false, error: "Unknown agent" },
        { status: 404 },
      );
    }
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: "asset must be USDC or NOVA" },
        { status: 400 },
      );
    }
    if (!paymentTxHash) {
      return NextResponse.json(
        { ok: false, error: "paymentTxHash is required" },
        { status: 400 },
      );
    }

    // Idempotent: this exact payment already activated a clearance.
    const already = await findSubscriptionByPaymentTx(paymentTxHash);
    if (already) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        subscription: already,
      });
    }

    // Verify on-chain BEFORE short-circuiting on an existing active row so a
    // valid new payment is never silently dropped when DB briefly lags.
    const verified = await verifyAgentSubscriptionPayment({
      paymentTxHash,
      walletAddress: address,
      agentId,
      asset,
    });

    const current = await getActiveAgentSubscription(address, agentId);
    if (current) {
      // Already unlocked — still OK to return success for this wallet.
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        subscription: current,
      });
    }

    const subscription = await activateAgentSubscription({
      walletAddress: address,
      agentId,
      paymentAsset: asset,
      amountPaid: verified.amountHuman,
      paymentTxHash,
    });

    return NextResponse.json({
      ok: true,
      alreadyActive: false,
      subscription,
    });
  } catch (err) {
    console.error("[agents/subscribe]", err);
    const message = mapSupabaseError(
      err,
      err instanceof Error ? err.message : "Failed to activate subscription",
    );
    const retry =
      /not found yet|not confirmed|unreachable|retry|pending/i.test(message);
    return NextResponse.json(
      { ok: false, error: message, retry },
      { status: retry ? 409 : 500 },
    );
  }
}
