/** Futures venues Evolgo agents can target (perp liquidity). */
export type EvolgoVenue = "binance" | "okx" | "bybit";

export type ExchangeDefinition = {
  id: string;
  name: string;
  blurb: string;
  /** Futures endpoint label used in handshake UI copy. */
  endpointLabel: string;
  /** Canonical venue slug for agent/strategy catalog. */
  venue: EvolgoVenue;
  /** Connectable now vs reserved for later. */
  availability: "live" | "coming_soon";
};

/** Evolgo Contabo egress IP — operators should whitelist only this address. */
export const EVOLGO_EXCHANGE_WHITELIST_IP = "169.58.176.239";

const VENUE_LABELS: Record<EvolgoVenue, string> = {
  binance: "Binance",
  okx: "OKX",
  bybit: "Bybit",
};

/** Venues available for agent API integration (futures only). */
export const EXCHANGE_CATALOG: readonly ExchangeDefinition[] = [
  {
    id: "binance-futures",
    name: "Binance Futures",
    blurb: "USD-M perpetual futures · top liquidity",
    endpointLabel: "fapi.binance.com",
    venue: "binance",
    availability: "live",
  },
  {
    id: "okx-futures",
    name: "OKX Futures",
    blurb: "USDT / USDC perpetual futures · deep books",
    endpointLabel: "www.okx.com",
    venue: "okx",
    availability: "live",
  },
  {
    id: "bybit-futures",
    name: "Bybit Futures",
    blurb: "USDT perpetual futures · coming soon",
    endpointLabel: "api.bybit.com",
    venue: "bybit",
    availability: "coming_soon",
  },
] as const;

/** Connectable venues shown as active in the Exchange / API picker. */
export const CONNECTABLE_EXCHANGES = EXCHANGE_CATALOG.filter(
  (e) => e.availability === "live",
);

export function getExchangeById(id: string): ExchangeDefinition | undefined {
  return EXCHANGE_CATALOG.find((e) => e.id === id);
}

/** Display label for a venue slug. */
export function venueLabel(venue: EvolgoVenue): string {
  return VENUE_LABELS[venue];
}

/** Format marketplace chips: "Venues · Binance · OKX". */
export function formatVenuesLine(venues: readonly EvolgoVenue[]): string {
  if (!venues.length) return "Venues · —";
  return `Venues · ${venues.map(venueLabel).join(" · ")}`;
}

/** Map catalog venue → exchange catalog id (live venues only). */
export function exchangeIdForVenue(venue: EvolgoVenue): string | null {
  const hit = EXCHANGE_CATALOG.find(
    (e) => e.venue === venue && e.availability === "live",
  );
  return hit?.id ?? null;
}

export function venueFromExchangeId(exchangeId: string): EvolgoVenue | null {
  return getExchangeById(exchangeId)?.venue ?? null;
}

export function isOkxExchange(exchangeId: string): boolean {
  return exchangeId === "okx-futures";
}

/** Security checklist bullets for the connect modal banner. */
export function exchangeSecurityChecklist(exchangeId: string): string[] {
  if (isOkxExchange(exchangeId)) {
    return [
      "Enable Trade + Read permissions",
      "Disable Withdrawals (required)",
      "Passphrase required when creating the API key",
      `IP whitelist if OKX UI offers it · Evolgo IP ${EVOLGO_EXCHANGE_WHITELIST_IP}`,
    ];
  }
  return [
    `Whitelist only Evolgo IP: ${EVOLGO_EXCHANGE_WHITELIST_IP}`,
    "Enable Reading + Futures",
    "Disable Withdrawals (required)",
    "USD-M must be Single-Asset Mode (not Multi-Assets)",
    "If your region only allows Multi-Assets → use OKX",
  ];
}

export const BINANCE_MULTI_ASSET_NOTE =
  "Some regions require Multi-Assets Mode on Binance, which Evolgo does not support. OKX is the recommended alternative.";
