import { createHash } from "crypto";
import { REFERRAL_CODE_LENGTH } from "@/config/referrals";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function hashToCode(material: string): string {
  const digest = createHash("sha256").update(material).digest();
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += ALPHABET[digest[i]! % ALPHABET.length]!;
  }
  return code;
}

/**
 * Deterministic 6-char code for a MultiversX bech32 address.
 * Optional `nonce` breaks collisions without changing the alphabet.
 * Server-only (Node crypto).
 */
export function codeFromAddress(address: string, nonce = 0): string {
  const normalized = address.trim().toLowerCase();
  const secret =
    process.env.REFERRAL_CODE_SALT?.trim() || "evolgo-referral-v1";
  const material =
    nonce === 0
      ? `${secret}:${normalized}`
      : `${secret}:${normalized}:n${nonce}`;
  return hashToCode(material);
}

export {
  normalizeReferralCode,
  isValidReferralCode,
} from "@/lib/referrals/codeFormat";
