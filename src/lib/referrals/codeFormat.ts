import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
} from "@/config/referrals";

export function normalizeReferralCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== REFERRAL_CODE_LENGTH) return null;
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

export function isValidReferralCode(raw: string | null | undefined): boolean {
  return normalizeReferralCode(raw) !== null;
}
