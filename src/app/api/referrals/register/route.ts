import { NextResponse } from "next/server";
import { buildInviteUrl, getReferralTier } from "@/config/referrals";
import { registerReferralAddress } from "@/lib/referrals/registry";

export const runtime = "nodejs";

type Body = {
  address?: string;
};

/**
 * POST /api/referrals/register
 * Body: { address: string }
 *
 * Allocates (or returns) a deterministic personal invite code for a wallet.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const address = body.address?.trim();
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 },
      );
    }

    const record = await registerReferralAddress(address);
    const tier = getReferralTier(record.tier);
    return NextResponse.json({
      ok: true,
      code: record.code,
      address: record.address,
      tier: record.tier,
      tierLabel: tier.label,
      rewardPercent: tier.rewardPercent,
      inviteUrl: buildInviteUrl(record.code),
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("[NOVA] Referral register failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to register referral code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
