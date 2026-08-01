import { NextResponse } from "next/server";
import { buildInviteUrl, getReferralTier } from "@/config/referrals";
import {
  getReferralBalance,
  getReferralByAddress,
  listLedgerForReferrer,
  registerReferralAddress,
} from "@/lib/referrals/registry";

export const runtime = "nodejs";

/**
 * GET /api/referrals/me?address=erd1...
 * Ensures a code exists for the wallet and returns invite + recent ledger.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.trim();
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
        { status: 400 },
      );
    }

    let record = await getReferralByAddress(address);
    if (!record) {
      record = await registerReferralAddress(address);
    }

    const tier = getReferralTier(record.tier);
    const ledger = await listLedgerForReferrer(address, 12);
    const paid = ledger.filter((e) => e.status === "paid");
    const totalRewardAtomic = paid.reduce(
      (sum, e) => sum + BigInt(e.rewardNovaAtomic || "0"),
      BigInt(0),
    );
    const balance = await getReferralBalance(address);

    return NextResponse.json({
      ok: true,
      code: record.code,
      address: record.address,
      tier: record.tier,
      tierLabel: tier.label,
      rewardPercent: tier.rewardPercent,
      inviteUrl: buildInviteUrl(record.code),
      stats: {
        attributedBuys: paid.length,
        totalRewardAtomic: totalRewardAtomic.toString(),
        claimableBalance: balance?.claimableBalance ?? 0,
        totalClaimed: balance?.totalClaimed ?? 0,
      },
      ledger,
    });
  } catch (err) {
    console.error("[NOVA] Referral me failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to load referral profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
