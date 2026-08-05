export type ExchangeDefinition = {
  id: string;
  name: string;
  blurb: string;
};

export const EXCHANGE_CATALOG: readonly ExchangeDefinition[] = [
  {
    id: "binance",
    name: "Binance",
    blurb: "Spot & futures liquidity · global CEX",
  },
  {
    id: "okx",
    name: "OKX",
    blurb: "Unified trading account · deep books",
  },
  {
    id: "kraken",
    name: "Kraken",
    blurb: "Institutional rails · fiat on-ramps",
  },
  {
    id: "multiversx-dex",
    name: "MultiversX DEX",
    blurb: "On-chain xExchange · native $NOVA lanes",
  },
] as const;

export function getExchangeById(id: string): ExchangeDefinition | undefined {
  return EXCHANGE_CATALOG.find((e) => e.id === id);
}
