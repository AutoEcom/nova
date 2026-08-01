import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  DEFAULT_REFERRAL_TIER,
  type ReferralTierId,
} from "@/config/referrals";
import { normalizeReferralCode } from "@/lib/referrals/codeFormat";
import { codeFromAddress } from "@/lib/referrals/codes";

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

type RegistryFile = {
  byCode: Record<string, ReferralRecord>;
  byAddress: Record<string, string>;
  ledger: ReferralLedgerEntry[];
};

const EMPTY: RegistryFile = { byCode: {}, byAddress: {}, ledger: [] };

function registryPath(): string {
  const custom = process.env.REFERRAL_DATA_DIR?.trim();
  const dir = custom || path.join(process.cwd(), ".data");
  return path.join(dir, "referral-registry.json");
}

async function ensureDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function readRegistry(): Promise<RegistryFile> {
  const file = registryPath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as RegistryFile;
    return {
      byCode: parsed.byCode ?? {},
      byAddress: parsed.byAddress ?? {},
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
    };
  } catch {
    return { ...EMPTY, byCode: {}, byAddress: {}, ledger: [] };
  }
}

async function writeRegistry(data: RegistryFile) {
  const file = registryPath();
  await ensureDir(file);
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function isBech32Address(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address.trim());
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
  const data = await readRegistry();

  const existingCode = data.byAddress[addressKey];
  if (existingCode && data.byCode[existingCode]) {
    return data.byCode[existingCode]!;
  }

  let nonce = 0;
  let code = codeFromAddress(address, nonce);
  while (data.byCode[code] && data.byCode[code]!.address.toLowerCase() !== addressKey) {
    nonce += 1;
    code = codeFromAddress(address, nonce);
    if (nonce > 64) {
      throw new Error("Unable to allocate a unique referral code");
    }
  }

  const record: ReferralRecord = {
    address,
    code,
    tier: DEFAULT_REFERRAL_TIER,
    createdAt: new Date().toISOString(),
  };
  data.byCode[code] = record;
  data.byAddress[addressKey] = code;
  await writeRegistry(data);
  return record;
}

export async function resolveReferralCode(
  codeRaw: string | null | undefined,
): Promise<ReferralRecord | null> {
  const code = normalizeReferralCode(codeRaw);
  if (!code) return null;
  const data = await readRegistry();
  return data.byCode[code] ?? null;
}

export async function getReferralByAddress(
  addressRaw: string,
): Promise<ReferralRecord | null> {
  const addressKey = addressRaw.trim().toLowerCase();
  if (!addressKey) return null;
  const data = await readRegistry();
  const code = data.byAddress[addressKey];
  if (!code) return null;
  return data.byCode[code] ?? null;
}

export async function findLedgerByPayment(
  paymentTxHash: string,
): Promise<ReferralLedgerEntry | null> {
  const key = paymentTxHash.trim().toLowerCase();
  const data = await readRegistry();
  return (
    data.ledger.find((e) => e.paymentTxHash.toLowerCase() === key) ?? null
  );
}

export async function appendLedgerEntry(
  entry: ReferralLedgerEntry,
): Promise<void> {
  const data = await readRegistry();
  const key = entry.paymentTxHash.toLowerCase();
  const idx = data.ledger.findIndex(
    (e) => e.paymentTxHash.toLowerCase() === key,
  );
  if (idx >= 0) data.ledger[idx] = entry;
  else data.ledger.unshift(entry);
  // Cap local ledger growth for the file-backed MVP.
  if (data.ledger.length > 5000) data.ledger.length = 5000;
  await writeRegistry(data);
}

export async function listLedgerForReferrer(
  addressRaw: string,
  limit = 20,
): Promise<ReferralLedgerEntry[]> {
  const addressKey = addressRaw.trim().toLowerCase();
  const data = await readRegistry();
  return data.ledger
    .filter((e) => e.referrer.toLowerCase() === addressKey)
    .slice(0, limit);
}
