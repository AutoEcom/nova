"use client";

import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  REFERRAL_QUERY_PARAM,
  REFERRAL_STORAGE_KEY,
} from "@/config/referrals";
import { normalizeReferralCode } from "@/lib/referrals/codeFormat";

type StoredAttribution = {
  code: string;
  savedAt: string;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function writeLocal(code: string) {
  if (typeof localStorage === "undefined") return;
  const payload: StoredAttribution = {
    code,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(payload));
}

function readLocal(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    return normalizeReferralCode(parsed?.code);
  } catch {
    return null;
  }
}

/** Persist an invite code to cookie + localStorage (≥30 days). */
export function persistReferralCode(raw: string): string | null {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  writeLocal(code);
  writeCookie(REFERRAL_COOKIE_NAME, code, REFERRAL_COOKIE_MAX_AGE_SECONDS);
  return code;
}

/**
 * Read the active attributed code (localStorage first, then cookie).
 * Does not clear it — attribution sticks until expiry / overwrite.
 */
export function getStoredReferralCode(): string | null {
  return readLocal() ?? normalizeReferralCode(readCookie(REFERRAL_COOKIE_NAME));
}

/**
 * Capture `?r=` from the current URL and persist it.
 * Returns the captured code, or null when absent / invalid.
 */
export function captureReferralFromLocation(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get(REFERRAL_QUERY_PARAM);
    if (!raw) return null;
    return persistReferralCode(raw);
  } catch {
    return null;
  }
}
