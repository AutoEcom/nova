import { DEFAULT_REFERRAL_TIER, getReferralTier } from "@/config/referrals";
import { isStakingContractConfigured } from "@/config/staking";
import {
  getReferralByAddress,
  registerReferralAddress,
  setReferralTier,
  type ReferralRecord,
} from "@/lib/referrals/registry";
import {
  queryIsSyndicateEligible,
  querySyndicateStakedAtomic,
} from "@/lib/staking/query";

export type SyndicateSyncResult = {
  address: string;
  contractConfigured: boolean;
  syndicateEligible: boolean;
  syndicateStakedAtomic: string;
  tier: ReferralRecord["tier"];
  tierLabel: string;
  tierUpdated: boolean;
  record: ReferralRecord | null;
};

/**
 * Read on-chain Syndicate stake and elevate (or demote) referral tier.
 * Eligible → `syndicate`; otherwise back to Operator (does not overwrite Commander).
 */
export async function syncSyndicateReferralTier(
  addressRaw: string,
): Promise<SyndicateSyncResult> {
  const address = addressRaw.trim();
  if (!isStakingContractConfigured()) {
    const record = await getReferralByAddress(address);
    const tier = record?.tier ?? DEFAULT_REFERRAL_TIER;
    return {
      address,
      contractConfigured: false,
      syndicateEligible: false,
      syndicateStakedAtomic: "0",
      tier,
      tierLabel: getReferralTier(tier).label,
      tierUpdated: false,
      record,
    };
  }

  const [eligible, stakedAtomic] = await Promise.all([
    queryIsSyndicateEligible(address),
    querySyndicateStakedAtomic(address),
  ]);

  let record =
    (await getReferralByAddress(address)) ??
    (await registerReferralAddress(address));
  let tierUpdated = false;

  if (eligible && record.tier !== "syndicate") {
    record = await setReferralTier(address, "syndicate");
    tierUpdated = true;
  } else if (
    !eligible &&
    record.tier === "syndicate"
  ) {
    // Drop Syndicate privilege when the 90D position is gone.
    record = await setReferralTier(address, DEFAULT_REFERRAL_TIER);
    tierUpdated = true;
  }

  return {
    address,
    contractConfigured: true,
    syndicateEligible: eligible,
    syndicateStakedAtomic: stakedAtomic.toString(),
    tier: record.tier,
    tierLabel: getReferralTier(record.tier).label,
    tierUpdated,
    record,
  };
}
