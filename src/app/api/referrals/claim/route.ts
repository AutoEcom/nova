import { NextResponse } from "next/server";
import { isTreasurySignerConfigured } from "@/lib/mx/treasuryAccount";
import { claimReferralRewards } from "@/lib/referrals/payout";
import { healClaimableFromAttributions } from "@/lib/referrals/registry";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  address?: string;
};

/**
 * POST /api/referrals/claim
 * Body: { address: string }
 *
 * Sends the operator's claimable referral NOVA from the treasury and settles
 * Supabase `referral_balances`.
 */
export async function POST(request: Request) {
  try {
    if (!isTreasurySignerConfigured()) {
      return NextResponse.json(
        {
          error:
            "Treasury signer is not configured. Set TREASURY_WALLET_PEM or TREASURY_MNEMONIC.",
          code: "SIGNER_MISSING",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as Body;
    const address = body.address?.trim();
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 },
      );
    }

    await healClaimableFromAttributions(address);
    const result = await claimReferralRewards(address);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[NOVA] Referral claim failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to claim referral rewards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
