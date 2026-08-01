import { NextResponse } from "next/server";
import { fulfillNovaPurchase } from "@/lib/mx/fulfillPurchase";
import { isTreasurySignerConfigured } from "@/lib/mx/treasuryAccount";
import { normalizeReferralCode } from "@/lib/referrals/codeFormat";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  paymentTxHash?: string;
  referralCode?: string | null;
};

/**
 * POST /api/nova/fulfill
 * Body: { paymentTxHash: string, referralCode?: string }
 *
 * After the buyer pays EGLD/USDC to the treasury, the client calls this route.
 * The server verifies the payment on-chain, sends the matching $NOVA amount
 * from the treasury wallet to the buyer, and optionally pays a referral bonus.
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

    const referralCode = normalizeReferralCode(body.referralCode ?? null);
    const result = await fulfillNovaPurchase(paymentTxHash, { referralCode });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[NOVA] Fulfillment failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to deliver $NOVA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
