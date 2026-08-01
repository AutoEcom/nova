import { NextResponse } from "next/server";
import { fulfillNovaPurchase } from "@/lib/mx/fulfillPurchase";
import { isTreasurySignerConfigured } from "@/lib/mx/treasuryAccount";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  paymentTxHash?: string;
};

/**
 * POST /api/nova/fulfill
 * Body: { paymentTxHash: string }
 *
 * After the buyer pays EGLD/USDC to the treasury, the client calls this route.
 * The server verifies the payment on-chain and sends the matching $NOVA amount
 * from the treasury wallet to the buyer.
 */
export async function POST(request: Request) {
  try {
    if (!isTreasurySignerConfigured()) {
      return NextResponse.json(
        {
          error:
            "Automatic NOVA delivery is not configured. Set TREASURY_WALLET_PEM or TREASURY_MNEMONIC in server environment variables.",
          code: "SIGNER_MISSING",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as Body;
    const paymentTxHash = body.paymentTxHash?.trim();
    if (!paymentTxHash) {
      return NextResponse.json(
        { error: "paymentTxHash is required" },
        { status: 400 },
      );
    }

    const result = await fulfillNovaPurchase(paymentTxHash);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[NOVA] Fulfillment failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to deliver $NOVA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
