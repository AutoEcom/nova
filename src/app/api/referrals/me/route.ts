import { NextResponse } from "next/server";
import { buildInviteUrl, getReferralTier } from "@/config/referrals";
import {
  getReferralBalance,
  getReferralByAddress,
  healClaimableFromAttributions,
  listLedgerForReferrer,
  registerReferralAddress,
} from "@/lib/referrals/registry";
import { isStakingContractConfigured } from "@/config/staking";
import { syncSyndicateReferralTier } from "@/lib/staking/syncSyndicateTier";

export const runtime = "nodejs";

/**
 * GET /api/referrals/me?address=erd1...
 * Ensures a code exists for the wallet and returns invite + recent ledger.
 * When the staking SC is configured, syncs Syndicate referral tier from on-chain stake.
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

    if (isStakingContractConfigured()) {
      try {
        const sync = await syncSyndicateReferralTier(address);
        if (sync.record) record = sync.record;
      } catch (err) {
        console.warn("[NOVA] Syndicate tier sync skipped", err);
      }
    }

    const tier = getReferralTier(record.tier);
    await healClaimableFromAttributions(address);
    const ledger = await listLedgerForReferrer(address, 12);
    const attributed = ledger.filter(
      (e) =>
        e.status === "paid" ||
        e.status === "accrued" ||
        e.status === "claimed",
    );
    const totalRewardAtomic = attributed.reduce(
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
        attributedBuys: attributed.length,
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
