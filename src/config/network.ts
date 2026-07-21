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

/**
 * Project treasury that receives EGLD / USDC for $NOVA purchases.
 * Set NEXT_PUBLIC_TREASURY_ADDRESS in `.env.local` before mainnet payments.
 */
export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ??
  "erd1qqqqqqqqqqqqqpgqtmcuh307t6kky677ernjj9ulk64zq74w9l5qxyhdn7";

export const isTreasuryConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_TREASURY_ADDRESS);