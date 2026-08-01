/**
 * Referral program constants — tiers, rates, invite link shape.
 * Rates are expressed in basis points (1% = 100 bps) for integer-safe math.
 */

/** Query param used in public invite links: evolgo.app?r=XXXXXX */
export const REFERRAL_QUERY_PARAM = "r";

/** Canonical public origin for shareable invite links. */
export const REFERRAL_PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://evolgo.app";

/** 6-char alphanumeric invite codes (A-Z0-9). */
export const REFERRAL_CODE_LENGTH = 6;
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6}$/;

/** Persist attributed codes for at least 30 days. */
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const REFERRAL_STORAGE_KEY = "evolgo_ref";
export const REFERRAL_COOKIE_NAME = "evolgo_ref";

/**
 * Scalable tier ladder. Only Operator is active today; Commander / Syndicate
 * multipliers are reserved for future unlocks without reshaping the UI schema.
 */
export type ReferralTierId = "operator" | "commander" | "syndicate";

export type ReferralTier = {
  id: ReferralTierId;
  label: string;
  /** Referrer bonus as % of invited buyer's purchased NOVA (display). */
  rewardPercent: number;
  /** Same rate in basis points (7.5% → 750). */
  rewardBps: number;
  /** Short status line for the dashboard. */
  blurb: string;
  /** Whether the tier can be earned/selected today. */
  active: boolean;
};

export const REFERRAL_TIERS: readonly ReferralTier[] = [
  {
    id: "operator",
    label: "Operator",
    rewardPercent: 7.5,
    rewardBps: 750,
    blurb: "Base network cut on every attributed purchase.",
    active: true,
  },
  {
    id: "commander",
    label: "Commander",
    rewardPercent: 10,
    rewardBps: 1000,
    blurb: "Elevated yield for sustained high-volume cohorts.",
    active: false,
  },
  {
    id: "syndicate",
    label: "Syndicate",
    rewardPercent: 12.5,
    rewardBps: 1250,
    blurb: "Maximum protocol share for elite network captains.",
    active: false,
  },
] as const;

export const DEFAULT_REFERRAL_TIER: ReferralTierId = "operator";

export function getReferralTier(id: ReferralTierId = DEFAULT_REFERRAL_TIER): ReferralTier {
  return REFERRAL_TIERS.find((t) => t.id === id) ?? REFERRAL_TIERS[0];
}

/** Build a shareable invite URL for a normalized code. */
export function buildInviteUrl(code: string): string {
  const normalized = code.trim().toUpperCase();
  return `${REFERRAL_PUBLIC_ORIGIN}/?${REFERRAL_QUERY_PARAM}=${encodeURIComponent(normalized)}`;
}
