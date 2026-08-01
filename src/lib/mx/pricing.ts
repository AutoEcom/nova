import {
  API_URL,
  FALLBACK_EGLD_PRICE_USD,
  MIN_PURCHASE_USDC,
  NOVA_PER_USDC,
} from "@/config/network";

export type PaymentAsset = "EGLD" | "USDC";

/**
 * Live EGLD/USD spot price from the MultiversX economics endpoint.
 * Falls back to {@link FALLBACK_EGLD_PRICE_USD} on any failure so the
 * calculator always produces a usable figure.
 * @see https://api.multiversx.com/economics
 */
export async function fetchEgldPriceUsd(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/economics`, { cache: "no-store" });
    if (!res.ok) return FALLBACK_EGLD_PRICE_USD;
    const data = (await res.json()) as { price?: number };
    const price = Number(data?.price);
    return Number.isFinite(price) && price > 0 ? price : FALLBACK_EGLD_PRICE_USD;
  } catch {
    return FALLBACK_EGLD_PRICE_USD;
  }
}

/**
 * USDC value of a payment `amount` in the chosen asset.
 * USDC is treated 1:1 with USD; EGLD is converted at the given spot price.
 */
export function usdcValueOf(
  amount: number,
  asset: PaymentAsset,
  egldPriceUsd: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return asset === "USDC" ? amount : amount * egldPriceUsd;
}

/** NOVA tokens received for a given USDC value (1 NOVA = 0.01 USDC). */
export function novaForUsdcValue(usdcValue: number): number {
  if (!Number.isFinite(usdcValue) || usdcValue <= 0) return 0;
  return usdcValue * NOVA_PER_USDC;
}

/** NOVA tokens received for a payment `amount` in the chosen asset. */
export function novaForAmount(
  amount: number,
  asset: PaymentAsset,
  egldPriceUsd: number,
): number {
  return novaForUsdcValue(usdcValueOf(amount, asset, egldPriceUsd));
}

/** Minimum purchase amount, denominated in the chosen asset. */
export function minAmountFor(asset: PaymentAsset, egldPriceUsd: number): number {
  if (asset === "USDC") return MIN_PURCHASE_USDC;
  return egldPriceUsd > 0
    ? MIN_PURCHASE_USDC / egldPriceUsd
    : Number.POSITIVE_INFINITY;
}

/**
 * True when `amount` (in the chosen asset) meets the strict minimum.
 *
 * Comparison is done in the *payment asset* (not only via USDC conversion) so
 * EGLD amounts derived from USD presets — which are rounded to a few decimals —
 * are not falsely rejected when `amount * egldPrice` lands a hair under $5
 * due to floating-point / truncation noise.
 */
export function meetsMinimum(
  amount: number,
  asset: PaymentAsset,
  egldPriceUsd: number,
): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const min = minAmountFor(asset, egldPriceUsd);
  if (!Number.isFinite(min) || min <= 0) return false;
  // Absolute floor for USDC; relative slack for EGLD (6-dp display rounding).
  const slack =
    asset === "USDC" ? 1e-6 : Math.max(min * 1e-4, 1e-8);
  return amount + slack >= min;
}
