/**
 * Staking pool definitions — 3-tier model for the EVOLGO protocol.
 * Shared by UI, mock state, and on-chain MultiversX contract IDs.
 */

export type StakingPoolId = "flexible" | "locked30" | "locked90";

/** On-chain `pool_id` argument for `stake(pool_id)`. */
export const STAKING_POOL_ONCHAIN_ID: Record<StakingPoolId, number> = {
  flexible: 0,
  locked30: 1,
  locked90: 2,
};

export type StakingPool = {
  id: StakingPoolId;
  name: string;
  tierLabel: string;
  blurb: string;
  /** Expected APY percent (display / mock accrual). */
  apyPercent: number;
  /** Lock duration in days; 0 = liquid / anytime unstake. */
  lockDays: number;
  accent: "cyan" | "purple" | "green";
  elite?: boolean;
  /** Minimum human NOVA required (Syndicate). */
  minStakeNova?: number;
};

export const STAKING_POOLS: readonly StakingPool[] = [
  {
    id: "flexible",
    name: "Flexible Pool",
    tierLabel: "Liquid",
    blurb: "Instant liquidity with baseline protocol yield.",
    apyPercent: 6,
    lockDays: 0,
    accent: "cyan",
  },
  {
    id: "locked30",
    name: "30-Days Locked",
    tierLabel: "Operator Tier",
    blurb: "Standard operator lockup for steady ecosystem growth.",
    apyPercent: 18,
    lockDays: 30,
    accent: "green",
  },
  {
    id: "locked90",
    name: "90-Days Locked",
    tierLabel: "Syndicate Tier — Elite",
    blurb: "Maximum yield & protocol multiplier for elite network commanders.",
    apyPercent: 42,
    lockDays: 90,
    accent: "purple",
    elite: true,
    minStakeNova: 10_000,
  },
] as const;

export function getStakingPool(id: StakingPoolId): StakingPool {
  return STAKING_POOLS.find((p) => p.id === id) ?? STAKING_POOLS[0]!;
}

/** Mock starting wallet balance for local UI exploration. */
export const MOCK_WALLET_NOVA = 10_000;

/** localStorage key for mock staking positions (dev / UI preview only). */
export const STAKING_MOCK_STORAGE_KEY = "evolgo_staking_mock_v1";

/**
 * Deployed Evolgo staking SC (bech32). When unset, the UI uses mock mode.
 * Set after `mxpy contract deploy` / sc-meta deploy.
 */
export const STAKING_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STAKING_CONTRACT?.trim() ?? "";

export const isStakingContractConfigured = () =>
  Boolean(STAKING_CONTRACT_ADDRESS);
