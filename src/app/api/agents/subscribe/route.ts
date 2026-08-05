import { NextResponse } from "next/server";
import { getAgentById } from "@/config/agents";
import {
  activateAgentSubscription,
  findSubscriptionByPaymentTx,
  getActiveAgentSubscription,
} from "@/lib/agents/registry";
import type { AgentPaymentAsset } from "@/lib/agents/createSubscriptionPayment";
import { verifyAgentSubscriptionPayment } from "@/lib/agents/verifySubscriptionPayment";

export const runtime = "nodejs";

/**
 * POST /api/agents/subscribe
 * Body: { address, agentId, asset: "USDC"|"NOVA", paymentTxHash }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      agentId?: string;
      asset?: AgentPaymentAsset;
      paymentTxHash?: string;
    };

    const address = body.address?.trim() ?? "";
    const agentId = body.agentId?.trim() ?? "";
    const asset = body.asset === "NOVA" ? "NOVA" : body.asset === "USDC" ? "USDC" : null;
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

    const already = await findSubscriptionByPaymentTx(paymentTxHash);
    if (already) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        subscription: already,
      });
    }

    const current = await getActiveAgentSubscription(address, agentId);
    if (current) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        subscription: current,
      });
    }

    const verified = await verifyAgentSubscriptionPayment({
      paymentTxHash,
      walletAddress: address,
      agentId,
      asset,
    });

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
    const message =
      err instanceof Error ? err.message : "Failed to activate subscription";
    const retry =
      message.includes("not found yet") || message.includes("not confirmed");
    return NextResponse.json(
      { ok: false, error: message, retry },
      { status: retry ? 409 : 500 },
    );
  }
}
