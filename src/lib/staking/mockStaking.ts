"use client";

import {
  MOCK_WALLET_NOVA,
  STAKING_MOCK_STORAGE_KEY,
  STAKING_POOLS,
  type StakingPoolId,
  getStakingPool,
} from "@/config/staking";

export type MockPosition = {
  poolId: StakingPoolId;
  staked: number;
  /** ISO unlock time; null = liquid / unlocked. */
  unlockAt: string | null;
  /** Accrued claimable rewards in this pool (NOVA). */
  claimable: number;
  /** Last accrual timestamp (ms). */
  lastAccruedAt: number;
};

export type MockStakingState = {
  walletNova: number;
  positions: Record<StakingPoolId, MockPosition>;
  lifetimeClaimed: number;
};

function emptyPositions(now = Date.now()): Record<StakingPoolId, MockPosition> {
  return {
    flexible: {
      poolId: "flexible",
      staked: 0,
      unlockAt: null,
      claimable: 0,
      lastAccruedAt: now,
    },
    locked30: {
      poolId: "locked30",
      staked: 0,
      unlockAt: null,
      claimable: 0,
      lastAccruedAt: now,
    },
    locked90: {
      poolId: "locked90",
      staked: 0,
      unlockAt: null,
      claimable: 0,
      lastAccruedAt: now,
    },
  };
}

export function createInitialMockState(): MockStakingState {
  return {
    walletNova: MOCK_WALLET_NOVA,
    positions: emptyPositions(),
    lifetimeClaimed: 0,
  };
}

export function loadMockStakingState(): MockStakingState {
  if (typeof window === "undefined") return createInitialMockState();
  try {
    const raw = localStorage.getItem(STAKING_MOCK_STORAGE_KEY);
    if (!raw) return createInitialMockState();
    const parsed = JSON.parse(raw) as MockStakingState;
    const base = createInitialMockState();
    return {
      walletNova: Number(parsed.walletNova) || base.walletNova,
      lifetimeClaimed: Number(parsed.lifetimeClaimed) || 0,
      positions: {
        ...base.positions,
        ...parsed.positions,
      },
    };
  } catch {
    return createInitialMockState();
  }
}

export function saveMockStakingState(state: MockStakingState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAKING_MOCK_STORAGE_KEY, JSON.stringify(state));
}

/** Accrue rewards for all positions based on APY since lastAccruedAt. */
export function accrueMockRewards(
  state: MockStakingState,
  now = Date.now(),
): MockStakingState {
  const positions = { ...state.positions };
  for (const pool of STAKING_POOLS) {
    const pos = positions[pool.id];
    if (!pos || pos.staked <= 0) {
      positions[pool.id] = { ...pos, lastAccruedAt: now };
      continue;
    }
    const elapsedMs = Math.max(0, now - pos.lastAccruedAt);
    const yearMs = 365.25 * 24 * 60 * 60 * 1000;
    const earned = pos.staked * (pool.apyPercent / 100) * (elapsedMs / yearMs);
    positions[pool.id] = {
      ...pos,
      claimable: pos.claimable + earned,
      lastAccruedAt: now,
    };
  }
  return { ...state, positions };
}

export function totalStaked(state: MockStakingState): number {
  return STAKING_POOLS.reduce(
    (sum, p) => sum + (state.positions[p.id]?.staked ?? 0),
    0,
  );
}

export function totalClaimable(state: MockStakingState): number {
  return STAKING_POOLS.reduce(
    (sum, p) => sum + (state.positions[p.id]?.claimable ?? 0),
    0,
  );
}

export function hasEliteStake(state: MockStakingState): boolean {
  return (state.positions.locked90?.staked ?? 0) > 0;
}

export function isUnlocked(pos: MockPosition, now = Date.now()): boolean {
  if (!pos.unlockAt) return true;
  return new Date(pos.unlockAt).getTime() <= now;
}

export function stakeIntoPool(
  state: MockStakingState,
  poolId: StakingPoolId,
  amount: number,
  now = Date.now(),
): MockStakingState {
  if (!(amount > 0) || amount > state.walletNova) {
    throw new Error("Insufficient available $NOVA");
  }
  const accrued = accrueMockRewards(state, now);
  const pool = getStakingPool(poolId);
  const pos = accrued.positions[poolId];
  const unlockAt =
    pool.lockDays > 0
      ? new Date(now + pool.lockDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  return {
    ...accrued,
    walletNova: accrued.walletNova - amount,
    positions: {
      ...accrued.positions,
      [poolId]: {
        ...pos,
        staked: pos.staked + amount,
        // Extending a lock resets/extends unlock from now (mock policy).
        unlockAt: unlockAt ?? pos.unlockAt,
        lastAccruedAt: now,
      },
    },
  };
}

export function unstakeFromPool(
  state: MockStakingState,
  poolId: StakingPoolId,
  amount: number,
  now = Date.now(),
): MockStakingState {
  const accrued = accrueMockRewards(state, now);
  const pos = accrued.positions[poolId];
  if (!(amount > 0) || amount > pos.staked) {
    throw new Error("Insufficient staked amount");
  }
  if (!isUnlocked(pos, now)) {
    throw new Error("Position is still locked");
  }
  const nextStaked = pos.staked - amount;
  return {
    ...accrued,
    walletNova: accrued.walletNova + amount,
    positions: {
      ...accrued.positions,
      [poolId]: {
        ...pos,
        staked: nextStaked,
        unlockAt: nextStaked > 0 ? pos.unlockAt : null,
        lastAccruedAt: now,
      },
    },
  };
}

export function claimAllRewards(
  state: MockStakingState,
  now = Date.now(),
): MockStakingState {
  const accrued = accrueMockRewards(state, now);
  const claimable = totalClaimable(accrued);
  if (!(claimable > 0)) {
    throw new Error("No claimable rewards");
  }
  const positions = { ...accrued.positions };
  for (const pool of STAKING_POOLS) {
    positions[pool.id] = {
      ...positions[pool.id]!,
      claimable: 0,
      lastAccruedAt: now,
    };
  }
  return {
    ...accrued,
    walletNova: accrued.walletNova + claimable,
    lifetimeClaimed: accrued.lifetimeClaimed + claimable,
    positions,
  };
}

export function claimPoolRewards(
  state: MockStakingState,
  poolId: StakingPoolId,
  now = Date.now(),
): MockStakingState {
  const accrued = accrueMockRewards(state, now);
  const pos = accrued.positions[poolId];
  if (!(pos.claimable > 0)) {
    throw new Error("No claimable rewards in this pool");
  }
  return {
    ...accrued,
    walletNova: accrued.walletNova + pos.claimable,
    lifetimeClaimed: accrued.lifetimeClaimed + pos.claimable,
    positions: {
      ...accrued.positions,
      [poolId]: { ...pos, claimable: 0, lastAccruedAt: now },
    },
  };
}
