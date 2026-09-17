export type ExchangeDefinition = {
  id: string;
  name: string;
  blurb: string;
  /** Futures endpoint label used in handshake UI copy. */
  endpointLabel: string;
};

/** Evolgo Contabo egress IP — operators should whitelist only this address. */
export const EVOLGO_EXCHANGE_WHITELIST_IP = "169.58.176.239";

/** Venues available for agent API integration (futures only). */
export const EXCHANGE_CATALOG: readonly ExchangeDefinition[] = [
  {
    id: "binance-futures",
    name: "Binance Futures",
    blurb: "USD-M perpetual futures · top liquidity",
    endpointLabel: "fapi.binance.com",
  },
  {
    id: "okx-futures",
    name: "OKX Futures",
    blurb: "USDT / USDC perpetual futures · deep books",
    endpointLabel: "www.okx.com",
  },
] as const;

export function getExchangeById(id: string): ExchangeDefinition | undefined {
  return EXCHANGE_CATALOG.find((e) => e.id === id);
}
