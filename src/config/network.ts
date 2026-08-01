import { EnvironmentsEnum } from "@multiversx/sdk-dapp/out/types/enums.types";

/** MultiversX Mainnet */
export const CHAIN_ID = "1";
export const ENVIRONMENT = EnvironmentsEnum.mainnet;
export const API_URL = "https://api.multiversx.com";
export const EXPLORER_URL = "https://explorer.multiversx.com";

/**
 * WalletConnect Cloud Project ID
 * Get one at https://cloud.walletconnect.com
 */
export const WALLET_CONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "YOUR_WALLETCONNECT_PROJECT_ID";

/** $NOVA ESDT identifier on MultiversX */
export const NOVA_TOKEN_ID = "NOVA-04c5f5";

/** Bridged USDC on MultiversX Mainnet */
export const USDC_TOKEN_ID = "USDC-c76f1f";

export const EGLD_DECIMALS = 18;
export const USDC_DECIMALS = 6;
/** Assumed NOVA decimals — adjust if token metadata differs */
export const NOVA_DECIMALS = 18;

/* ------------------------------------------------------------------ *
 * $NOVA sale pricing (fixed rate)
 * ------------------------------------------------------------------ */

/** Fixed sale price: 1 NOVA = 0.01 USDC. */
export const NOVA_PRICE_IN_USDC = 0.01;
/** Derived: 1 USDC buys 100 NOVA. */
export const NOVA_PER_USDC = 100;

/** Strict minimum purchase, denominated in USDC (EGLD equivalent computed live). */
export const MIN_PURCHASE_USDC = 5;

/** USDC quick-select presets. Also seeds the EGLD-equivalent presets. */
export const USDC_PRESETS = [5, 10, 25, 50, 100] as const;

/**
 * Fallback EGLD/USD price used only when the live economics endpoint is
 * unavailable, so the calculator degrades gracefully instead of breaking.
 */
export const FALLBACK_EGLD_PRICE_USD = 30;

/**
 * Project treasury that receives EGLD / USDC for $NOVA purchases and holds
 * the $NOVA inventory used for automatic delivery after payment.
 * Set NEXT_PUBLIC_TREASURY_ADDRESS in `.env.local` / Vercel.
 */
export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ??
  "erd1aufyc6j0q9aqda7cev7erad22xm7g0vhupv9rccd5xjgjgcetypqzey2me";

export const isTreasuryConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_TREASURY_ADDRESS);