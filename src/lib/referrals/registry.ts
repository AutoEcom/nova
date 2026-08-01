import { NOVA_DECIMALS } from "@/config/network";
import {
  DEFAULT_REFERRAL_TIER,
  type ReferralTierId,
} from "@/config/referrals";
import { normalizeReferralCode } from "@/lib/referrals/codeFormat";
import { codeFromAddress } from "@/lib/referrals/codes";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type ReferralRecord = {
  address: string;
  code: string;
  tier: ReferralTierId;
  createdAt: string;
};

export type ReferralLedgerEntry = {
  paymentTxHash: string;
  buyer: string;
  referrer: string;
  code: string;
  tier: ReferralTierId;
  buyerNovaAtomic: string;
  rewardNovaAtomic: string;
  rewardTxHash: string | null;
  createdAt: string;
  status: "paid" | "skipped" | "failed";
  reason?: string;
};

export type ReferralBalance = {
  walletAddress: string;
  claimableBalance: number;
  totalClaimed: number;
  updatedAt: string;
};

type CodeRow = {
  wallet_address: string;
  code: string;
  tier: string | null;
  created_at: string;
};

type AttributionRow = {
  payment_tx_hash: string | null;
  referred_wallet: string;
  referrer_code: string;
  referrer_wallet: string | null;
  amount_nova: number | string | null;
  amount_nova_atomic: string | null;
  reward_tx_hash: string | null;
  status: string;
  reason: string | null;
  created_at: string;
};

type BalanceRow = {
  wallet_address: string;
  claimable_balance: number | string | null;
  total_claimed: number | string | null;
  updated_at: string;
};

function db() {
  return createServiceSupabaseClient();
}

function isBech32Address(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address.trim());
}

function normalizeTier(raw: string | null | undefined): ReferralTierId {
  const value = (raw ?? DEFAULT_REFERRAL_TIER).trim().toLowerCase();
  if (value === "commander" || value === "syndicate" || value === "operator") {
    return value;
  }
  return DEFAULT_REFERRAL_TIER;
}

function tierLabelForDb(tier: ReferralTierId): string {
  if (tier === "commander") return "Commander";
  if (tier === "syndicate") return "Syndicate";
  return "Operator";
}

function rowToRecord(row: CodeRow): ReferralRecord {
  return {
    address: row.wallet_address,
    code: row.code.toUpperCase(),
    tier: normalizeTier(row.tier),
    createdAt: row.created_at,
  };
}

function atomicToHumanNumber(atomic: string): number {
  try {
    const value = BigInt(atomic || "0");
    const base = BigInt(10) ** BigInt(NOVA_DECIMALS);
    const whole = value / base;
    const frac = value % base;
    const fracStr = frac
      .toString()
      .padStart(NOVA_DECIMALS, "0")
      .slice(0, 8)
      .replace(/0+$/, "");
    return Number(fracStr ? `${whole}.${fracStr}` : whole.toString());
  } catch {
    return 0;
  }
}

function attributionToLedger(
  row: AttributionRow,
  tier: ReferralTierId = DEFAULT_REFERRAL_TIER,
): ReferralLedgerEntry {
  const status =
    row.status === "paid" || row.status === "failed" || row.status === "skipped"
      ? row.status
      : "skipped";
  return {
    paymentTxHash: (row.payment_tx_hash ?? "").toLowerCase(),
    buyer: row.referred_wallet,
    referrer: row.referrer_wallet ?? "",
    code: row.referrer_code.toUpperCase(),
    tier,
    buyerNovaAtomic: "0",
    rewardNovaAtomic: row.amount_nova_atomic ?? "0",
    rewardTxHash: row.reward_tx_hash,
    createdAt: row.created_at,
    status,
    reason: row.reason ?? undefined,
  };
}

/**
 * Register (or return) a personal invite code for a wallet.
 * Codes are deterministic; collision with another wallet bumps a nonce.
 */
export async function registerReferralAddress(
  addressRaw: string,
): Promise<ReferralRecord> {
  const address = addressRaw.trim();
  if (!isBech32Address(address)) {
    throw new Error("Invalid MultiversX address");
  }
  const addressKey = address.toLowerCase();
  const supabase = db();

  const existing = await getReferralByAddress(addressKey);
  if (existing) return existing;

  let nonce = 0;
  let code = codeFromAddress(address, nonce);
  for (;;) {
    const { data: conflict } = await supabase
      .from("referral_codes")
      .select("wallet_address, code")
      .eq("code", code)
      .maybeSingle();

    if (!conflict || conflict.wallet_address.toLowerCase() === addressKey) {
      break;
    }
    nonce += 1;
    code = codeFromAddress(address, nonce);
    if (nonce > 64) {
      throw new Error("Unable to allocate a unique referral code");
    }
  }

  const { data, error } = await supabase
    .from("referral_codes")
    .upsert(
      {
        wallet_address: addressKey,
        code,
        tier: tierLabelForDb(DEFAULT_REFERRAL_TIER),
      },
      { onConflict: "wallet_address" },
    )
    .select("wallet_address, code, tier, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register referral code");
  }

  // Ensure a balances row exists for the referrer.
  await supabase.from("referral_balances").upsert(
    {
      wallet_address: addressKey,
      claimable_balance: 0,
      total_claimed: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet_address", ignoreDuplicates: true },
  );

  return rowToRecord(data as CodeRow);
}

export async function resolveReferralCode(
  codeRaw: string | null | undefined,
): Promise<ReferralRecord | null> {
  const code = normalizeReferralCode(codeRaw);
  if (!code) return null;
  const { data, error } = await db()
    .from("referral_codes")
    .select("wallet_address, code, tier, created_at")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRecord(data as CodeRow) : null;
}

export async function getReferralByAddress(
  addressRaw: string,
): Promise<ReferralRecord | null> {
  const addressKey = addressRaw.trim().toLowerCase();
  if (!addressKey) return null;
  const { data, error } = await db()
    .from("referral_codes")
    .select("wallet_address, code, tier, created_at")
    .eq("wallet_address", addressKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRecord(data as CodeRow) : null;
}

export async function findLedgerByPayment(
  paymentTxHash: string,
): Promise<ReferralLedgerEntry | null> {
  const key = paymentTxHash.trim().toLowerCase();
  const { data, error } = await db()
    .from("referral_attributions")
    .select(
      "payment_tx_hash, referred_wallet, referrer_code, referrer_wallet, amount_nova, amount_nova_atomic, reward_tx_hash, status, reason, created_at",
    )
    .eq("payment_tx_hash", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const codeRecord = await resolveReferralCode(
    (data as AttributionRow).referrer_code,
  );
  return attributionToLedger(
    data as AttributionRow,
    codeRecord?.tier ?? DEFAULT_REFERRAL_TIER,
  );
}

export async function appendLedgerEntry(
  entry: ReferralLedgerEntry,
): Promise<void> {
  const supabase = db();
  const paymentHash = entry.paymentTxHash.toLowerCase();
  const amountHuman = atomicToHumanNumber(entry.rewardNovaAtomic);

  const { error } = await supabase.from("referral_attributions").upsert(
    {
      payment_tx_hash: paymentHash || null,
      referred_wallet: entry.buyer.toLowerCase(),
      referrer_code: entry.code.toUpperCase(),
      referrer_wallet: entry.referrer ? entry.referrer.toLowerCase() : null,
      amount_nova: amountHuman,
      amount_nova_atomic: entry.rewardNovaAtomic,
      reward_tx_hash: entry.rewardTxHash,
      status: entry.status,
      reason: entry.reason ?? null,
      created_at: entry.createdAt || new Date().toISOString(),
    },
    { onConflict: "payment_tx_hash" },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (entry.status === "paid" && entry.referrer) {
    await creditReferrerBalance(entry.referrer, amountHuman);
  }
}

async function creditReferrerBalance(
  walletRaw: string,
  amountNova: number,
): Promise<void> {
  if (!(amountNova > 0)) return;
  const wallet = walletRaw.toLowerCase();
  const supabase = db();
  const { data: existing } = await supabase
    .from("referral_balances")
    .select("wallet_address, claimable_balance, total_claimed")
    .eq("wallet_address", wallet)
    .maybeSingle();

  const row = existing as BalanceRow | null;
  const claimable = Number(row?.claimable_balance ?? 0);
  const claimed = Number(row?.total_claimed ?? 0);

  // Immediate on-chain payouts count as claimed; claimable stays for future claim flow.
  const { error } = await supabase.from("referral_balances").upsert(
    {
      wallet_address: wallet,
      claimable_balance: claimable,
      total_claimed: claimed + amountNova,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet_address" },
  );
  if (error) throw new Error(error.message);
}

export async function listLedgerForReferrer(
  addressRaw: string,
  limit = 20,
): Promise<ReferralLedgerEntry[]> {
  const addressKey = addressRaw.trim().toLowerCase();
  const record = await getReferralByAddress(addressKey);
  const { data, error } = await db()
    .from("referral_attributions")
    .select(
      "payment_tx_hash, referred_wallet, referrer_code, referrer_wallet, amount_nova, amount_nova_atomic, reward_tx_hash, status, reason, created_at",
    )
    .or(
      [
        `referrer_wallet.eq.${addressKey}`,
        record ? `referrer_code.eq.${record.code}` : null,
      ]
        .filter(Boolean)
        .join(","),
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const tier = record?.tier ?? DEFAULT_REFERRAL_TIER;
  return ((data ?? []) as AttributionRow[]).map((row) =>
    attributionToLedger(row, tier),
  );
}

export async function getReferralBalance(
  addressRaw: string,
): Promise<ReferralBalance | null> {
  const wallet = addressRaw.trim().toLowerCase();
  if (!wallet) return null;
  const { data, error } = await db()
    .from("referral_balances")
    .select("wallet_address, claimable_balance, total_claimed, updated_at")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as BalanceRow;
  return {
    walletAddress: row.wallet_address,
    claimableBalance: Number(row.claimable_balance ?? 0),
    totalClaimed: Number(row.total_claimed ?? 0),
    updatedAt: row.updated_at,
  };
}
