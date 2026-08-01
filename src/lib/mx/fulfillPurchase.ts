import type { Account } from "@multiversx/sdk-core";
import {
  API_URL,
  EGLD_DECIMALS,
  FALLBACK_EGLD_PRICE_USD,
  MIN_PURCHASE_USDC,
  NOVA_DECIMALS,
  NOVA_PER_USDC,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { fetchEgldPriceUsd, meetsMinimum } from "@/lib/mx/pricing";
import {
  sendNovaFromTreasury,
  sendTreasuryMemoReceipt,
} from "@/lib/mx/sendNova";
import { loadTreasuryAccount } from "@/lib/mx/treasuryAccount";

const FULFILL_PREFIX = "nova-fill:";
const TX_POLL_ATTEMPTS = 36;
const TX_POLL_MS = 2000;

/** In-flight locks so concurrent fulfill requests for the same payment don't double-send. */
const inFlight = new Map<string, Promise<FulfillResult>>();

type ApiOperation = {
  type?: string;
  sender?: string;
  receiver?: string;
  value?: string;
  identifier?: string;
  decimals?: number;
};

type ApiTransaction = {
  txHash?: string;
  status?: string;
  sender?: string;
  receiver?: string;
  value?: string;
  data?: string;
  timestamp?: number;
  operations?: ApiOperation[];
};

export type FulfillResult = {
  alreadyFulfilled: boolean;
  paymentTxHash: string;
  fulfillTxHash: string;
  buyer: string;
  asset: "EGLD" | "USDC";
  paidAmountHuman: string;
  usdcValue: number;
  novaAmountHuman: string;
  novaAmountAtomic: string;
  referral?: {
    code: string | null;
    referrer: string | null;
    paid: boolean;
    rewardTxHash: string | null;
    rewardNovaAtomic: string;
    reason?: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function decodeTxData(data?: string): string {
  if (!data) return "";
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(data) && data.length % 4 === 0) {
      const decoded = Buffer.from(data, "base64").toString("utf8");
      if (/^[\x20-\x7E]+$/.test(decoded)) return decoded;
    }
    return data;
  } catch {
    return data;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`MultiversX API ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

async function waitForSuccessfulPayment(txHash: string): Promise<ApiTransaction> {
  let lastError: Error | null = null;
  for (let i = 0; i < TX_POLL_ATTEMPTS; i++) {
    try {
      const tx = await fetchJson<ApiTransaction>(
        `${API_URL}/transactions/${txHash}`,
      );
      if (tx.status === "success") return tx;
      if (tx.status === "fail" || tx.status === "invalid") {
        throw new Error(
          `Payment transaction ${txHash} failed on-chain (${tx.status})`,
        );
      }
      lastError = new Error(
        `Payment ${txHash} still ${tx.status ?? "pending"}`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("failed on-chain")) throw lastError;
    }
    await sleep(TX_POLL_MS);
  }
  throw lastError ?? new Error(`Timed out waiting for payment ${txHash}`);
}

function parsePayment(tx: ApiTransaction): {
  buyer: string;
  asset: "EGLD" | "USDC";
  paidAtomic: bigint;
  decimals: number;
} {
  if (!tx.sender) throw new Error("Payment tx missing sender");

  const ops = tx.operations ?? [];
  const usdcOp = ops.find(
    (op) =>
      sameAddress(op.receiver, TREASURY_ADDRESS) &&
      (op.type === "esdtTransfer" ||
        op.type === "ESDTTransfer" ||
        op.type === "token") &&
      op.identifier === USDC_TOKEN_ID,
  );
  if (usdcOp?.value) {
    return {
      buyer: tx.sender,
      asset: "USDC",
      paidAtomic: BigInt(usdcOp.value),
      decimals: usdcOp.decimals ?? USDC_DECIMALS,
    };
  }

  const egldOp = ops.find(
    (op) =>
      sameAddress(op.receiver, TREASURY_ADDRESS) &&
      (op.type === "egld" ||
        op.type === "EGLD" ||
        op.type === "transfer" ||
        op.type === "WriteLog") &&
      op.value &&
      BigInt(op.value) > BigInt(0) &&
      !op.identifier,
  );
  if (egldOp?.value) {
    return {
      buyer: tx.sender,
      asset: "EGLD",
      paidAtomic: BigInt(egldOp.value),
      decimals: EGLD_DECIMALS,
    };
  }

  const native = BigInt(tx.value ?? "0");
  if (native > BigInt(0) && sameAddress(tx.receiver, TREASURY_ADDRESS)) {
    return {
      buyer: tx.sender,
      asset: "EGLD",
      paidAtomic: native,
      decimals: EGLD_DECIMALS,
    };
  }

  const decoded = decodeTxData(tx.data);
  if (decoded.startsWith("ESDTTransfer@")) {
    const parts = decoded.split("@");
    const tokenHex = parts[1] ?? "";
    const amountHex = parts[2] ?? "0";
    const tokenId = Buffer.from(tokenHex, "hex").toString("utf8");
    if (tokenId !== USDC_TOKEN_ID) {
      throw new Error(`Unsupported ESDT payment token: ${tokenId}`);
    }
    if (!sameAddress(tx.receiver, TREASURY_ADDRESS)) {
      throw new Error("ESDT payment receiver is not the treasury");
    }
    return {
      buyer: tx.sender,
      asset: "USDC",
      paidAtomic: BigInt(`0x${amountHex || "0"}`),
      decimals: USDC_DECIMALS,
    };
  }

  throw new Error(
    "Could not parse a USDC or EGLD payment to the treasury from this transaction",
  );
}

function atomicToHuman(atomic: bigint, decimals: number): number {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = atomic / base;
  const frac = atomic % base;
  return Number(whole) + Number(frac) / Number(base);
}

function humanToAtomic(human: number, decimals: number): bigint {
  if (!Number.isFinite(human) || human <= 0) {
    throw new Error("Invalid NOVA amount");
  }
  const scaled = Math.round(human * 10 ** Math.min(decimals, 8));
  const extra = decimals > 8 ? BigInt(10) ** BigInt(decimals - 8) : BigInt(1);
  return BigInt(scaled) * extra;
}

async function computeNovaOut(
  asset: "EGLD" | "USDC",
  paidAtomic: bigint,
  decimals: number,
): Promise<{ usdcValue: number; novaHuman: number; novaAtomic: bigint }> {
  if (asset === "USDC") {
    const usdcValue = atomicToHuman(paidAtomic, decimals);
    if (!meetsMinimum(usdcValue, "USDC", 1)) {
      throw new Error(
        `Payment below minimum (${MIN_PURCHASE_USDC} USDC). Got ${usdcValue.toFixed(4)} USDC`,
      );
    }
    const exp = NOVA_DECIMALS - decimals;
    const novaAtomic =
      exp >= 0
        ? paidAtomic * BigInt(NOVA_PER_USDC) * BigInt(10) ** BigInt(exp)
        : (paidAtomic * BigInt(NOVA_PER_USDC)) / (BigInt(10) ** BigInt(-exp));
    return {
      usdcValue,
      novaHuman: usdcValue * NOVA_PER_USDC,
      novaAtomic,
    };
  }

  const egldHuman = atomicToHuman(paidAtomic, decimals);
  const egldPrice = (await fetchEgldPriceUsd()) || FALLBACK_EGLD_PRICE_USD;
  const usdcValue = egldHuman * egldPrice;
  if (!meetsMinimum(egldHuman, "EGLD", egldPrice)) {
    throw new Error(
      `Payment below minimum (${MIN_PURCHASE_USDC} USDC equivalent). Got ≈ ${usdcValue.toFixed(4)} USDC`,
    );
  }
  const novaHuman = usdcValue * NOVA_PER_USDC;
  return {
    usdcValue,
    novaHuman,
    novaAtomic: humanToAtomic(novaHuman, NOVA_DECIMALS),
  };
}

async function findReceiptTxHash(paymentTxHash: string): Promise<string | null> {
  const needle = `${FULFILL_PREFIX}${paymentTxHash}`.toLowerCase();
  try {
    const txs = await fetchJson<ApiTransaction[]>(
      `${API_URL}/accounts/${TREASURY_ADDRESS}/transactions?size=50&status=success`,
    );
    for (const tx of txs) {
      const data = decodeTxData(tx.data).toLowerCase();
      if (data.includes(needle) && tx.txHash) return tx.txHash;
    }
  } catch (err) {
    console.warn("[NOVA] Receipt lookup failed", err);
  }
  return null;
}

async function findMatchingNovaTransfer(args: {
  buyer: string;
  novaAtomic: bigint;
  paymentTimestamp?: number;
}): Promise<string | null> {
  try {
    const txs = await fetchJson<ApiTransaction[]>(
      `${API_URL}/accounts/${TREASURY_ADDRESS}/transactions?size=40&status=success&token=${NOVA_TOKEN_ID}`,
    );
    for (const tx of txs) {
      if (
        args.paymentTimestamp &&
        tx.timestamp &&
        tx.timestamp + 5 < args.paymentTimestamp
      ) {
        continue;
      }
      const match = (tx.operations ?? []).find(
        (op) =>
          sameAddress(op.sender, TREASURY_ADDRESS) &&
          sameAddress(op.receiver, args.buyer) &&
          op.identifier === NOVA_TOKEN_ID &&
          op.value === args.novaAtomic.toString(),
      );
      if (match && tx.txHash) return tx.txHash;
    }
  } catch (err) {
    console.warn("[NOVA] Matching NOVA transfer lookup failed", err);
  }
  return null;
}

async function getTreasuryNovaBalanceAtomic(): Promise<bigint> {
  try {
    const token = await fetchJson<{ balance?: string }>(
      `${API_URL}/accounts/${TREASURY_ADDRESS}/tokens/${NOVA_TOKEN_ID}`,
    );
    return BigInt(token.balance ?? "0");
  } catch {
    return BigInt(0);
  }
}

async function sendNovaAndReceipt(
  treasury: Account,
  buyer: string,
  novaAtomic: bigint,
  paymentTxHash: string,
): Promise<string> {
  const fulfillTxHash = await sendNovaFromTreasury(
    treasury,
    buyer,
    novaAtomic,
    { confirm: true },
  );

  // Best-effort idempotency memo — never fail the purchase if this drops.
  await sendTreasuryMemoReceipt(
    treasury,
    `${FULFILL_PREFIX}${paymentTxHash}`,
  );

  return fulfillTxHash;
}

async function fulfillNovaPurchaseUnlocked(
  paymentTxHash: string,
  referralCode?: string | null,
): Promise<FulfillResult> {
  const hash = paymentTxHash.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error("Invalid payment transaction hash");
  }

  console.info("[NOVA] Fulfill start", { hash, referralCode: referralCode ?? null });

  const receipt = await findReceiptTxHash(hash);
  if (receipt) {
    console.info("[NOVA] Already fulfilled (receipt)", { hash, receipt });
    return {
      alreadyFulfilled: true,
      paymentTxHash: hash,
      fulfillTxHash: receipt,
      buyer: "",
      asset: "USDC",
      paidAmountHuman: "0",
      usdcValue: 0,
      novaAmountHuman: "0",
      novaAmountAtomic: "0",
    };
  }

  const paymentTx = await waitForSuccessfulPayment(hash);
  const payment = parsePayment(paymentTx);
  const { usdcValue, novaHuman, novaAtomic } = await computeNovaOut(
    payment.asset,
    payment.paidAtomic,
    payment.decimals,
  );

  console.info("[NOVA] Payment parsed", {
    hash,
    buyer: payment.buyer,
    asset: payment.asset,
    paidAtomic: payment.paidAtomic.toString(),
    novaAtomic: novaAtomic.toString(),
    usdcValue,
  });

  const existingNova = await findMatchingNovaTransfer({
    buyer: payment.buyer,
    novaAtomic,
    paymentTimestamp: paymentTx.timestamp,
  });
  if (existingNova) {
    console.info("[NOVA] Already fulfilled (matching transfer)", {
      hash,
      existingNova,
    });
    return {
      alreadyFulfilled: true,
      paymentTxHash: hash,
      fulfillTxHash: existingNova,
      buyer: payment.buyer,
      asset: payment.asset,
      paidAmountHuman: String(
        atomicToHuman(payment.paidAtomic, payment.decimals),
      ),
      usdcValue,
      novaAmountHuman: String(novaHuman),
      novaAmountAtomic: novaAtomic.toString(),
    };
  }

  const balance = await getTreasuryNovaBalanceAtomic();
  if (balance < novaAtomic) {
    throw new Error(
      `Treasury NOVA balance too low. Need ${novaAtomic.toString()} atomic, have ${balance.toString()}`,
    );
  }

  const treasury = loadTreasuryAccount();
  let fulfillTxHash: string;
  try {
    fulfillTxHash = await sendNovaAndReceipt(
      treasury,
      payment.buyer,
      novaAtomic,
      hash,
    );
  } catch (err) {
    console.error("[NOVA] Buyer NOVA delivery failed", err);
    throw err instanceof Error
      ? err
      : new Error("Failed to broadcast NOVA delivery transaction");
  }

  // Referral accrual must never fail the buyer's successful delivery response.
  let referral:
    | FulfillResult["referral"]
    | undefined;
  try {
    const { maybeAccrueReferralReward } = await import(
      "@/lib/referrals/payout"
    );
    const referralPayout = await maybeAccrueReferralReward({
      paymentTxHash: hash,
      buyer: payment.buyer,
      buyerNovaAtomic: novaAtomic,
      referralCode,
    });
    referral = {
      code: referralPayout.code,
      referrer: referralPayout.referrer,
      paid: referralPayout.paid,
      rewardTxHash: referralPayout.rewardTxHash,
      rewardNovaAtomic: referralPayout.rewardNovaAtomic,
      reason: referralPayout.reason,
    };
  } catch (err) {
    console.warn("[NOVA] Referral accrual failed (buyer NOVA already sent)", err);
    referral = {
      code: referralCode ?? null,
      referrer: null,
      paid: false,
      rewardTxHash: null,
      rewardNovaAtomic: "0",
      reason: "accrual_error",
    };
  }

  return {
    alreadyFulfilled: false,
    paymentTxHash: hash,
    fulfillTxHash,
    buyer: payment.buyer,
    asset: payment.asset,
    paidAmountHuman: String(
      atomicToHuman(payment.paidAtomic, payment.decimals),
    ),
    usdcValue,
    novaAmountHuman: String(novaHuman),
    novaAmountAtomic: novaAtomic.toString(),
    referral,
  };
}

/**
 * Verifies an on-chain payment to the treasury and sends the matching $NOVA
 * amount from the treasury wallet to the buyer.
 */
export async function fulfillNovaPurchase(
  paymentTxHash: string,
  options?: { referralCode?: string | null },
): Promise<FulfillResult> {
  const key = paymentTxHash.trim().toLowerCase();
  const existingJob = inFlight.get(key);
  if (existingJob) return existingJob;

  const job = fulfillNovaPurchaseUnlocked(key, options?.referralCode).finally(
    () => {
      inFlight.delete(key);
    },
  );
  inFlight.set(key, job);
  return job;
}
