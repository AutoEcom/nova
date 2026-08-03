/**
 * Tokenomics page content — supply allocation, accrual loop, staking tiers.
 */

export const TOTAL_SUPPLY = 450_000_000;

export const SUPPLY_ALLOCATIONS = [
  {
    id: "treasury",
    title: "Treasury & Protocol Rewards",
    percent: 45,
    amount: 202_500_000,
    detail: "Protocol incentives, buyback inventory, and long-horizon network rewards.",
  },
  {
    id: "ecosystem",
    title: "Ecosystem & DEX Liquidity",
    percent: 20,
    amount: 90_000_000,
    detail: "Market depth, partner integrations, and ecosystem growth programs.",
  },
  {
    id: "contributors",
    title: "Core Contributors & Development",
    percent: 20,
    amount: 90_000_000,
    detail: "12-month cliff / 36-month vest — aligned to multi-year protocol delivery.",
    vesting: "12m cliff · 36m vest",
  },
  {
    id: "operators",
    title: "Early Operators & Public Access",
    percent: 15,
    amount: 67_500_000,
    detail: "Public access, early operator programs, and network onboarding supply.",
  },
] as const;

export const VALUE_LOOP_STEPS = [
  {
    step: "01",
    title: "Protocol Inflows",
    body: "Fees, treasury receipts, and protocol activity concentrate value into the Evolgo treasury — the intake chamber of the closed-loop economy.",
  },
  {
    step: "02",
    title: "Automated Market Buyback",
    body: "Programmatic buybacks convert protocol inflows into $NOVA on the open market, reinforcing demand without inflationary minting.",
  },
  {
    step: "03",
    title: "Yield Re-injection",
    body: "Acquired $NOVA is redistributed as buyback-backed yield to committed stakers — rewarding lockups instead of printing new supply.",
  },
] as const;

export const TOKENOMICS_STAKING_TIERS = [
  {
    id: "flexible",
    name: "Flexible Pool",
    tier: "Liquid",
    apy: "~6% APY",
    lock: "None",
    blurb: "Baseline liquidity.",
    accent: "cyan" as const,
  },
  {
    id: "locked30",
    name: "30-Days Locked",
    tier: "Operator Tier",
    apy: "~18% APY",
    lock: "30 Days",
    blurb: "Standard operator lockup.",
    accent: "green" as const,
  },
  {
    id: "locked90",
    name: "90-Days Locked",
    tier: "Syndicate Elite",
    apy: "~42% APY + Buyback Share",
    lock: "90 Days",
    blurb: "Includes Custom Strategy Sandbox for advanced operators.",
    accent: "purple" as const,
    elite: true,
    minThreshold: "10,000 $NOVA",
  },
] as const;
