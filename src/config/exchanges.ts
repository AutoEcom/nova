export type ExchangeDefinition = {
  id: string;
  name: string;
  blurb: string;
};

/** Venues available for agent API integration (futures only). */
export const EXCHANGE_CATALOG: readonly ExchangeDefinition[] = [
  {
    id: "binance-futures",
    name: "Binance Futures",
    blurb: "USD-M perpetual futures · top liquidity",
  },
  {
    id: "okx-futures",
    name: "OKX Futures",
    blurb: "USDT / USDC perpetual futures · deep books",
  },
] as const;

export function getExchangeById(id: string): ExchangeDefinition | undefined {
  return EXCHANGE_CATALOG.find((e) => e.id === id);
}
