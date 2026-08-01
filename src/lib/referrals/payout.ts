import {
  Address,
  MainnetEntrypoint,
  Token,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
  type Account,
} from "@multiversx/sdk-core";
import {
  API_URL,
  CHAIN_ID,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
} from "@/config/network";
import { getReferralTier } from "@/config/referrals";
import {
  appendLedgerEntry,
  findLedgerByPayment,
  resolveReferralCode,
  type ReferralLedgerEntry,
} from "@/lib/referrals/registry";

const REF_RECEIPT_PREFIX = "nova-ref:";

export type ReferralPayoutResult = {
  attempted: boolean;
  paid: boolean;
  rewardTxHash: string | null;
  rewardNovaAtomic: string;
  referrer: string | null;
  code: string | null;
  reason?: string;
};

function createEntrypoint() {
  return new MainnetEntrypoint({
    url: API_URL,
    kind: "api",
  });
}

/** Integer-safe: reward = buyerNova * bps / 10_000 */
export function rewardAtomicForPurchase(
  buyerNovaAtomic: bigint,
  rewardBps: number,
): bigint {
  if (buyerNovaAtomic <= BigInt(0) || rewardBps <= 0) return BigInt(0);
  return (buyerNovaAtomic * BigInt(rewardBps)) / BigInt(10_000);
}

async function sendNovaTransfer(
  treasury: Account,
  receiver: string,
  novaAtomic: bigint,
): Promise<string> {
  const entrypoint = createEntrypoint();
  treasury.nonce = await entrypoint.recallAccountNonce(treasury.address);

  const factory = new TransferTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });
  const nova = new Token({ identifier: NOVA_TOKEN_ID });
  const transfer = new TokenTransfer({ token: nova, amount: novaAtomic });
  const tx = await factory.createTransactionForESDTTokenTransfer(
    treasury.address,
    {
      receiver: Address.newFromBech32(receiver),
      tokenTransfers: [transfer],
    },
  );
  tx.nonce = treasury.getNonceThenIncrement();
  tx.signature = await treasury.signTransaction(tx);
  return entrypoint.sendTransaction(tx);
}

async function sendReferralReceipt(
  treasury: Account,
  paymentTxHash: string,
): Promise<void> {
  try {
    const entrypoint = createEntrypoint();
    treasury.nonce = await entrypoint.recallAccountNonce(treasury.address);
    const factory = new TransferTransactionsFactory({
      config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
    });
    const receiptTx = await factory.createTransactionForNativeTokenTransfer(
      treasury.address,
      {
        receiver: treasury.address,
        nativeAmount: BigInt(0),
        data: new TextEncoder().encode(
          `${REF_RECEIPT_PREFIX}${paymentTxHash}`,
        ),
      },
    );
    receiptTx.nonce = treasury.getNonceThenIncrement();
    receiptTx.signature = await treasury.signTransaction(receiptTx);
    await entrypoint.sendTransaction(receiptTx);
  } catch (err) {
    console.warn("[NOVA] Referral receipt tx failed", err);
  }
}

/**
 * After a successful buyer NOVA delivery, attribute and pay the referrer.
 * Failures are recorded but never throw — purchase fulfillment must stay intact.
 */
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

export async function maybePayReferralReward(params: {
  paymentTxHash: string;
  buyer: string;
  buyerNovaAtomic: bigint;
  referralCode: string | null | undefined;
  treasury: Account;
}): Promise<ReferralPayoutResult> {
  const { paymentTxHash, buyer, buyerNovaAtomic, referralCode, treasury } =
    params;

  const existing = await findLedgerByPayment(paymentTxHash);
  if (existing?.status === "paid" && existing.rewardTxHash) {
    return {
      attempted: true,
      paid: true,
      rewardTxHash: existing.rewardTxHash,
      rewardNovaAtomic: existing.rewardNovaAtomic,
      referrer: existing.referrer,
      code: existing.code,
      reason: "already_paid",
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
    const entry: ReferralLedgerEntry = {
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
    };
    await appendLedgerEntry(entry);
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
    const entry: ReferralLedgerEntry = {
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
    };
    await appendLedgerEntry(entry);
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

  // Buyer NOVA already left the treasury — re-check remaining inventory.
  const treasuryNovaBalance = await getTreasuryNovaBalanceAtomic();
  if (treasuryNovaBalance < rewardAtomic) {
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
      status: "failed",
      reason: "insufficient_treasury",
    };
    await appendLedgerEntry(entry);
    return {
      attempted: true,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: rewardAtomic.toString(),
      referrer: record.address,
      code: record.code,
      reason: "insufficient_treasury",
    };
  }

  try {
    const rewardTxHash = await sendNovaTransfer(
      treasury,
      record.address,
      rewardAtomic,
    );
    await sendReferralReceipt(treasury, paymentTxHash.toLowerCase());
    const entry: ReferralLedgerEntry = {
      paymentTxHash: paymentTxHash.toLowerCase(),
      buyer,
      referrer: record.address,
      code: record.code,
      tier: record.tier,
      buyerNovaAtomic: buyerNovaAtomic.toString(),
      rewardNovaAtomic: rewardAtomic.toString(),
      rewardTxHash,
      createdAt: new Date().toISOString(),
      status: "paid",
    };
    await appendLedgerEntry(entry);
    return {
      attempted: true,
      paid: true,
      rewardTxHash,
      rewardNovaAtomic: rewardAtomic.toString(),
      referrer: record.address,
      code: record.code,
    };
  } catch (err) {
    console.error("[NOVA] Referral payout failed", err);
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
      status: "failed",
      reason: err instanceof Error ? err.message : "payout_failed",
    };
    await appendLedgerEntry(entry);
    return {
      attempted: true,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: rewardAtomic.toString(),
      referrer: record.address,
      code: record.code,
      reason: "payout_failed",
    };
  }
}
