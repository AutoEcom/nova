import type { Account } from "@multiversx/sdk-core";
import { NOVA_DECIMALS } from "@/config/network";
import { getReferralTier } from "@/config/referrals";
import {
  appendLedgerEntry,
  findLedgerByPayment,
  getReferralBalance,
  resolveReferralCode,
  settleClaimableBalance,
  type ReferralLedgerEntry,
} from "@/lib/referrals/registry";
import { sendNovaFromTreasury } from "@/lib/mx/sendNova";
import { loadTreasuryAccount } from "@/lib/mx/treasuryAccount";
import { API_URL, NOVA_TOKEN_ID, TREASURY_ADDRESS } from "@/config/network";

export type ReferralPayoutResult = {
  attempted: boolean;
  /** True when reward was accrued to claimable (not necessarily claimed on-chain). */
  paid: boolean;
  rewardTxHash: string | null;
  rewardNovaAtomic: string;
  referrer: string | null;
  code: string | null;
  reason?: string;
};

export type ClaimRewardsResult = {
  ok: true;
  claimTxHash: string;
  claimedNova: number;
  claimedNovaAtomic: string;
  claimableBalance: number;
  totalClaimed: number;
};

/** Integer-safe: reward = buyerNova * bps / 10_000 */
export function rewardAtomicForPurchase(
  buyerNovaAtomic: bigint,
  rewardBps: number,
): bigint {
  if (buyerNovaAtomic <= BigInt(0) || rewardBps <= 0) return BigInt(0);
  return (buyerNovaAtomic * BigInt(rewardBps)) / BigInt(10_000);
}

function humanToAtomic(human: number): bigint {
  if (!Number.isFinite(human) || human <= 0) return BigInt(0);
  const scaled = Math.round(human * 10 ** Math.min(NOVA_DECIMALS, 8));
  const extra =
    NOVA_DECIMALS > 8 ? BigInt(10) ** BigInt(NOVA_DECIMALS - 8) : BigInt(1);
  return BigInt(scaled) * extra;
}

async function getTreasuryNovaBalanceAtomic(): Promise<bigint> {
  try {
    const res = await fetch(
      `${API_URL}/accounts/${TREASURY_ADDRESS}/tokens/${NOVA_TOKEN_ID}`,
      { cache: "no-store" },
    );
    if (!res.ok) return BigInt(0);
    const token = (await res.json()) as { balance?: string };
    return BigInt(token.balance ?? "0");
  } catch {
    return BigInt(0);
  }
}

/**
 * Accrue the referrer's cut into Supabase `claimable_balance`.
 * Does NOT send tokens on purchase — the operator claims via /api/referrals/claim.
 * This keeps buyer fulfillment fast and avoids treasury nonce races.
 */
export async function maybeAccrueReferralReward(params: {
  paymentTxHash: string;
  buyer: string;
  buyerNovaAtomic: bigint;
  referralCode: string | null | undefined;
}): Promise<ReferralPayoutResult> {
  const { paymentTxHash, buyer, buyerNovaAtomic, referralCode } = params;

  const existing = await findLedgerByPayment(paymentTxHash);
  if (
    existing &&
    (existing.status === "accrued" ||
      existing.status === "paid" ||
      existing.status === "claimed")
  ) {
    return {
      attempted: true,
      paid: true,
      rewardTxHash: existing.rewardTxHash,
      rewardNovaAtomic: existing.rewardNovaAtomic,
      referrer: existing.referrer,
      code: existing.code,
      reason: "already_recorded",
    };
  }

  if (!referralCode) {
    return {
      attempted: false,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: "0",
      referrer: null,
      code: null,
      reason: "no_code",
    };
  }

  const record = await resolveReferralCode(referralCode);
  if (!record) {
    await appendLedgerEntry({
      paymentTxHash: paymentTxHash.toLowerCase(),
      buyer,
      referrer: "",
      code: referralCode.toUpperCase(),
      tier: "operator",
      buyerNovaAtomic: buyerNovaAtomic.toString(),
      rewardNovaAtomic: "0",
      rewardTxHash: null,
      createdAt: new Date().toISOString(),
      status: "skipped",
      reason: "unknown_code",
    });
    return {
      attempted: true,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: "0",
      referrer: null,
      code: referralCode.toUpperCase(),
      reason: "unknown_code",
    };
  }

  if (record.address.toLowerCase() === buyer.toLowerCase()) {
    await appendLedgerEntry({
      paymentTxHash: paymentTxHash.toLowerCase(),
      buyer,
      referrer: record.address,
      code: record.code,
      tier: record.tier,
      buyerNovaAtomic: buyerNovaAtomic.toString(),
      rewardNovaAtomic: "0",
      rewardTxHash: null,
      createdAt: new Date().toISOString(),
      status: "skipped",
      reason: "self_referral",
    });
    return {
      attempted: true,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: "0",
      referrer: record.address,
      code: record.code,
      reason: "self_referral",
    };
  }

  const tier = getReferralTier(record.tier);
  const rewardAtomic = rewardAtomicForPurchase(buyerNovaAtomic, tier.rewardBps);
  if (rewardAtomic <= BigInt(0)) {
    return {
      attempted: true,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: "0",
      referrer: record.address,
      code: record.code,
      reason: "zero_reward",
    };
  }

  const entry: ReferralLedgerEntry = {
    paymentTxHash: paymentTxHash.toLowerCase(),
    buyer,
    referrer: record.address,
    code: record.code,
    tier: record.tier,
    buyerNovaAtomic: buyerNovaAtomic.toString(),
    rewardNovaAtomic: rewardAtomic.toString(),
    rewardTxHash: null,
    createdAt: new Date().toISOString(),
    status: "accrued",
  };
  await appendLedgerEntry(entry);

  return {
    attempted: true,
    paid: true,
    rewardTxHash: null,
    rewardNovaAtomic: rewardAtomic.toString(),
    referrer: record.address,
    code: record.code,
    reason: "accrued",
  };
}

/** @deprecated Use maybeAccrueReferralReward — kept name alias for clarity in logs. */
export const maybePayReferralReward = maybeAccrueReferralReward;

const claimInFlight = new Map<string, Promise<ClaimRewardsResult>>();

/**
 * Send all claimable referral NOVA from the treasury to the operator wallet
 * and settle Supabase balances.
 */
export async function claimReferralRewards(
  addressRaw: string,
): Promise<ClaimRewardsResult> {
  const address = addressRaw.trim().toLowerCase();
  if (!/^erd1[a-z0-9]{58}$/.test(address)) {
    throw new Error("Invalid MultiversX address");
  }

  const existing = claimInFlight.get(address);
  if (existing) return existing;

  const job = claimReferralRewardsUnlocked(address).finally(() => {
    claimInFlight.delete(address);
  });
  claimInFlight.set(address, job);
  return job;
}

async function claimReferralRewardsUnlocked(
  address: string,
): Promise<ClaimRewardsResult> {
  const balance = await getReferralBalance(address);
  const claimable = Number(balance?.claimableBalance ?? 0);
  if (!(claimable > 0)) {
    throw new Error("No claimable referral rewards");
  }

  const amountAtomic = humanToAtomic(claimable);
  if (amountAtomic <= BigInt(0)) {
    throw new Error("Claimable amount too small to transfer");
  }

  const treasuryBal = await getTreasuryNovaBalanceAtomic();
  if (treasuryBal < amountAtomic) {
    throw new Error(
      `Treasury NOVA balance too low for claim. Need ${amountAtomic.toString()}, have ${treasuryBal.toString()}`,
    );
  }

  const treasury: Account = loadTreasuryAccount();
  const claimTxHash = await sendNovaFromTreasury(
    treasury,
    address,
    amountAtomic,
    { confirm: true },
  );

  const settled = await settleClaimableBalance(address, claimable);
  return {
    ok: true,
    claimTxHash,
    claimedNova: claimable,
    claimedNovaAtomic: amountAtomic.toString(),
    claimableBalance: settled.claimableBalance,
    totalClaimed: settled.totalClaimed,
  };
}
