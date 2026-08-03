"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { getAccount } from "@multiversx/sdk-dapp/out/methods/account/getAccount";
import { refreshAccount } from "@multiversx/sdk-dapp/out/utils/account/refreshAccount";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";
import {
  STAKING_POOLS,
  isStakingContractConfigured,
  type StakingPool,
  type StakingPoolId,
} from "@/config/staking";
import { NOVA_DECIMALS } from "@/config/network";
import { fetchWalletTokenBalances } from "@/lib/mx/fetchBalances";
import { formatTokenAmount } from "@/lib/mx/format";
import { signAndSendTransactions } from "@/lib/mx/signAndSendTransactions";
import {
  accrueMockRewards,
  claimAllRewards,
  claimPoolRewards,
  createInitialMockState,
  hasEliteStake,
  isUnlocked,
  loadMockStakingState,
  saveMockStakingState,
  stakeIntoPool,
  totalClaimable,
  totalStaked,
  unstakeFromPool,
  type MockStakingState,
} from "@/lib/staking/mockStaking";
import {
  queryUserPositions,
  type OnChainStakePosition,
} from "@/lib/staking/query";
import {
  createClaimRewardsTransaction,
  createStakeTransaction,
  createUnstakeTransaction,
} from "@/lib/staking/transactions";

function formatNova(amount: number, digits = 2): string {
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatUnlock(unlockAt: string | null, now: number): string {
  if (!unlockAt) return "Liquid — unstake anytime";
  const ms = new Date(unlockAt).getTime() - now;
  if (ms <= 0) return "Unlocked — ready to unstake";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `Unlocks in ${days}d ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `Unlocks in ${hours}h ${mins}m`;
}

function formatUnlockTs(unlockTs: number, now: number): string {
  if (!unlockTs) return "Liquid — unstake anytime";
  return formatUnlock(new Date(unlockTs * 1000).toISOString(), now);
}

const accentRing: Record<StakingPool["accent"], string> = {
  cyan: "border-cyan/35 bg-cyan/10",
  green: "border-green/35 bg-green/10",
  purple: "border-purple/40 bg-purple/10 shadow-[0_0_28px_rgba(168,85,247,0.12)]",
};

const accentText: Record<StakingPool["accent"], string> = {
  cyan: "text-cyan",
  green: "text-green",
  purple: "text-purple",
};

const onChainMode = isStakingContractConfigured();

export function StakingProgram() {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();
  const [state, setState] = useState<MockStakingState>(createInitialMockState);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedPool, setSelectedPool] = useState<StakingPoolId>("flexible");
  const [amount, setAmount] = useState("100");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [onChainPositions, setOnChainPositions] = useState<OnChainStakePosition[]>(
    [],
  );
  const [walletNovaOnChain, setWalletNovaOnChain] = useState(0);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(
    null,
  );
  const [loadingChain, setLoadingChain] = useState(false);

  useEffect(() => {
    if (!onChainMode) {
      setState(loadMockStakingState());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || onChainMode) return;
    saveMockStakingState(state);
  }, [state, hydrated]);

  useEffect(() => {
    if (onChainMode) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((prev) => accrueMockRewards(prev, t));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!onChainMode) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refreshOnChain = useCallback(async () => {
    if (!onChainMode || !account.address) {
      setOnChainPositions([]);
      setWalletNovaOnChain(0);
      return;
    }
    setLoadingChain(true);
    try {
      const [positions, balances] = await Promise.all([
        queryUserPositions(account.address),
        fetchWalletTokenBalances(account.address),
      ]);
      setOnChainPositions(positions);
      setWalletNovaOnChain(
        Number(formatTokenAmount(balances.nova.balance, NOVA_DECIMALS, 6)),
      );

      const poolPositions = positions.filter((p) => p.poolId === selectedPool);
      setSelectedPositionId((prev) => {
        if (prev && poolPositions.some((p) => p.positionId === prev)) return prev;
        return poolPositions[0]?.positionId ?? positions[0]?.positionId ?? null;
      });

      // Elevate referral Syndicate tier when 90D stake qualifies.
      void fetch("/api/staking/syndicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address }),
      }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load on-chain positions");
    } finally {
      setLoadingChain(false);
    }
  }, [account.address, selectedPool]);

  useEffect(() => {
    if (!onChainMode || !isLoggedIn) return;
    void refreshOnChain();
  }, [onChainMode, isLoggedIn, account.address, refreshOnChain]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    setError(null);
    window.setTimeout(() => setFlash(null), 2800);
  }, []);

  const runMockAction = useCallback(
    (fn: () => MockStakingState, success: string) => {
      setBusy(true);
      try {
        const next = fn();
        setState(next);
        showFlash(success);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [showFlash],
  );

  const pool = STAKING_POOLS.find((p) => p.id === selectedPool)!;
  const mockPosition = state.positions[selectedPool];

  const poolOnChain = useMemo(
    () => onChainPositions.filter((p) => p.poolId === selectedPool),
    [onChainPositions, selectedPool],
  );

  const selectedOnChain = useMemo(
    () =>
      onChainPositions.find((p) => p.positionId === selectedPositionId) ??
      poolOnChain[0] ??
      null,
    [onChainPositions, selectedPositionId, poolOnChain],
  );

  const stakedTotal = useMemo(() => {
    if (onChainMode) {
      return onChainPositions.reduce((sum, p) => sum + p.amountNova, 0);
    }
    return totalStaked(state);
  }, [onChainMode, onChainPositions, state]);

  const claimableTotal = useMemo(() => {
    if (onChainMode) {
      return onChainPositions.reduce((sum, p) => sum + p.pendingRewardsNova, 0);
    }
    return totalClaimable(state);
  }, [onChainMode, onChainPositions, state]);

  const poolStaked = onChainMode
    ? poolOnChain.reduce((s, p) => s + p.amountNova, 0)
    : mockPosition.staked;

  const poolClaimable = onChainMode
    ? poolOnChain.reduce((s, p) => s + p.pendingRewardsNova, 0)
    : mockPosition.claimable;

  const availableNova = onChainMode ? walletNovaOnChain : state.walletNova;

  const elite = useMemo(() => {
    if (onChainMode) {
      return onChainPositions.some(
        (p) => p.poolId === "locked90" && p.amountNova >= 10_000,
      );
    }
    return hasEliteStake(state);
  }, [onChainMode, onChainPositions, state]);

  const unlocked = onChainMode
    ? selectedOnChain
      ? selectedOnChain.unlockTimestamp * 1000 <= now
      : false
    : isUnlocked(mockPosition, now);

  const parsedAmount = Number(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleStake = async () => {
    if (!isLoggedIn) {
      openConnect();
      return;
    }
    if (!amountValid) {
      setError("Enter a valid stake amount");
      return;
    }
    if (pool.minStakeNova && parsedAmount < pool.minStakeNova) {
      setError(`Syndicate pool requires at least ${pool.minStakeNova.toLocaleString()} NOVA`);
      return;
    }

    if (!onChainMode) {
      runMockAction(
        () => stakeIntoPool(state, selectedPool, parsedAmount, Date.now()),
        `Staked ${formatNova(parsedAmount)} NOVA into ${pool.name}`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await refreshAccount();
      const latest = getAccount();
      if (!latest.address) throw new Error("Wallet address unavailable");
      const tx = await createStakeTransaction({
        senderAddress: latest.address,
        poolId: selectedPool,
        amount: amount.trim(),
        nonce: latest.nonce,
      });
      await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: `Staking into ${pool.name}…`,
          successMessage: "Stake confirmed on MultiversX",
          errorMessage: "Stake transaction failed",
        },
      });
      showFlash(`Stake submitted — ${formatNova(parsedAmount)} NOVA → ${pool.name}`);
      window.setTimeout(() => void refreshOnChain(), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stake failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUnstake = async () => {
    if (!isLoggedIn) {
      openConnect();
      return;
    }

    if (!onChainMode) {
      if (!amountValid) {
        setError("Enter a valid unstake amount");
        return;
      }
      runMockAction(
        () => unstakeFromPool(state, selectedPool, parsedAmount, Date.now()),
        `Unstaked ${formatNova(parsedAmount)} NOVA from ${pool.name}`,
      );
      return;
    }

    if (!selectedOnChain) {
      setError("Select an on-chain position to unstake");
      return;
    }
    if (selectedOnChain.unlockTimestamp * 1000 > Date.now()) {
      setError("Position is still locked");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await refreshAccount();
      const latest = getAccount();
      if (!latest.address) throw new Error("Wallet address unavailable");
      const tx = await createUnstakeTransaction({
        senderAddress: latest.address,
        positionId: selectedOnChain.positionId,
        nonce: latest.nonce,
      });
      await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: `Unstaking position #${selectedOnChain.positionId}…`,
          successMessage: "Unstake confirmed",
          errorMessage: "Unstake transaction failed",
        },
      });
      showFlash(`Unstake submitted for position #${selectedOnChain.positionId}`);
      window.setTimeout(() => void refreshOnChain(), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unstake failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClaimPool = async () => {
    if (!isLoggedIn) {
      openConnect();
      return;
    }

    if (!onChainMode) {
      runMockAction(
        () => claimPoolRewards(state, selectedPool, Date.now()),
        `Claimed pool rewards from ${pool.name}`,
      );
      return;
    }

    if (!selectedOnChain || selectedOnChain.pendingRewardsNova <= 0) {
      setError("No claimable rewards on the selected position");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await refreshAccount();
      const latest = getAccount();
      if (!latest.address) throw new Error("Wallet address unavailable");
      const tx = await createClaimRewardsTransaction({
        senderAddress: latest.address,
        positionId: selectedOnChain.positionId,
        nonce: latest.nonce,
      });
      await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: "Claiming staking rewards…",
          successMessage: "Rewards claimed",
          errorMessage: "Claim transaction failed",
        },
      });
      showFlash(`Claim submitted for position #${selectedOnChain.positionId}`);
      window.setTimeout(() => void refreshOnChain(), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClaimAll = async () => {
    if (!isLoggedIn) {
      openConnect();
      return;
    }

    if (!onChainMode) {
      runMockAction(
        () => claimAllRewards(state, Date.now()),
        `Claimed ${formatNova(claimableTotal, 4)} NOVA rewards`,
      );
      return;
    }

    const claimable = onChainPositions.filter((p) => p.pendingRewardsNova > 0);
    if (!claimable.length) {
      setError("No claimable rewards");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await refreshAccount();
      let latest = getAccount();
      if (!latest.address) throw new Error("Wallet address unavailable");

      for (let i = 0; i < claimable.length; i += 1) {
        const pos = claimable[i]!;
        if (i > 0) {
          await refreshAccount();
          latest = getAccount();
        }
        const tx = await createClaimRewardsTransaction({
          senderAddress: latest.address!,
          positionId: pos.positionId,
          nonce: latest.nonce,
        });
        await signAndSendTransactions({
          transactions: [tx],
          transactionsDisplayInfo: {
            processingMessage: `Claiming position #${pos.positionId}…`,
            successMessage: "Rewards claimed",
            errorMessage: "Claim transaction failed",
          },
        });
      }
      showFlash(`Claimed rewards across ${claimable.length} position(s)`);
      window.setTimeout(() => void refreshOnChain(), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  };

  const setMaxStake = () =>
    setAmount(String(Math.floor(availableNova * 100) / 100));
  const setMaxUnstake = () => {
    if (onChainMode) {
      setAmount(String(Math.floor((selectedOnChain?.amountNova ?? 0) * 100) / 100));
      return;
    }
    setAmount(String(Math.floor(mockPosition.staked * 100) / 100));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
          Staking
        </p>
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
          LOCK $NOVA. COMMAND YIELD.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Deploy capital across liquid and locked protocol pools. Higher lock
          tiers compound yield and unlock network authority across EVOLGO.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {onChainMode
            ? loadingChain
              ? "On-chain — syncing positions…"
              : "On-chain — MultiversX staking contract"
            : "Preview mode — mock balances for local UX testing"}
        </p>
      </div>

      <GlassCard strong>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Total Staked
            </p>
            <p className="mt-1 font-display text-xl font-semibold">
              {formatNova(stakedTotal)}{" "}
              <span className="text-sm text-muted">NOVA</span>
            </p>
          </div>
          <div className="rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
              Claimable Rewards
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-cyan">
              {formatNova(claimableTotal, 4)}{" "}
              <span className="text-sm text-muted">NOVA</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Available
            </p>
            <p className="mt-1 font-display text-xl font-semibold">
              {formatNova(availableNova)}{" "}
              <span className="text-sm text-muted">NOVA</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              {onChainMode ? "Open Positions" : "Lifetime Claimed"}
            </p>
            <p className="mt-1 font-display text-xl font-semibold">
              {onChainMode
                ? onChainPositions.length
                : formatNova(state.lifetimeClaimed, 4)}{" "}
              {!onChainMode && <span className="text-sm text-muted">NOVA</span>}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
          <div className="min-w-0">
            {error && (
              <p className="font-mono text-[11px] text-magenta">{error}</p>
            )}
            {flash && !error && (
              <p className="font-mono text-[11px] text-green">{flash}</p>
            )}
            {!flash && !error && (
              <p className="font-mono text-[11px] text-muted">
                {onChainMode
                  ? "Stake / unstake / claim sign real MultiversX transactions."
                  : "Rewards accrue live from your active positions."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {onChainMode && isLoggedIn && (
              <GlowButton
                variant="ghost"
                onClick={() => void refreshOnChain()}
                className={loadingChain || busy ? "pointer-events-none opacity-45" : ""}
              >
                Refresh
              </GlowButton>
            )}
            {!isLoggedIn ? (
              <GlowButton variant="cyan" onClick={() => openConnect()}>
                Connect Wallet
              </GlowButton>
            ) : (
              <GlowButton
                variant="purple"
                onClick={() => void handleClaimAll()}
                className={
                  claimableTotal <= 0 || busy
                    ? "pointer-events-none opacity-45"
                    : ""
                }
              >
                Claim Rewards
              </GlowButton>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard
        className={
          elite
            ? "border border-purple/40 shadow-[0_0_40px_rgba(168,85,247,0.14)]"
            : ""
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-purple">
              Utility Boost
            </p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-wide sm:text-xl">
              Syndicate lock unlocks network authority
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Active capital in the 90-day Syndicate pool elevates referral rank
              and prioritizes access to autonomous Agents — the protocol hook
              that turns staking into command leverage.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
              elite
                ? "border-purple/50 bg-purple/20 text-purple shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                : "border-purple/35 bg-purple/15 text-purple/85"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full bg-purple ${elite ? "animate-pulse" : "opacity-70"}`}
              aria-hidden
            />
            {elite ? "Elite Active" : "Locked — Stake 90D"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Referral tier uplift",
              body: elite
                ? "Commander / Syndicate multipliers unlocked for your invite network."
                : "Stake in 90-Days Locked to ascend beyond Operator referral yield.",
              on: elite,
            },
            {
              title: "Agents priority lane",
              body: elite
                ? "Priority queue for autonomous execution slots is armed."
                : "Elite lock grants first access when Agents capacity opens.",
              on: elite,
            },
            {
              title: "Protocol multiplier",
              body: elite
                ? "Maximum APY band + governance signal weight engaged."
                : "Syndicate capital compounds the highest protocol yield band.",
              on: elite,
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`rounded-xl border px-4 py-4 ${
                item.on
                  ? "border-purple/35 bg-purple/10"
                  : "border-white/8 bg-white/[0.03]"
              }`}
            >
              <p className="font-display text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {STAKING_POOLS.map((p, i) => {
          const posStaked = onChainMode
            ? onChainPositions
                .filter((x) => x.poolId === p.id)
                .reduce((s, x) => s + x.amountNova, 0)
            : state.positions[p.id].staked;
          const posClaimable = onChainMode
            ? onChainPositions
                .filter((x) => x.poolId === p.id)
                .reduce((s, x) => s + x.pendingRewardsNova, 0)
            : state.positions[p.id].claimable;
          const active = selectedPool === p.id;
          return (
            <GlassCard
              key={p.id}
              delay={0.06 * i}
              className={`cursor-pointer transition-all ${
                active ? accentRing[p.accent] : "hover:border-white/20"
              }`}
              onClick={() => {
                setSelectedPool(p.id);
                setError(null);
                if (onChainMode) {
                  const first = onChainPositions.find((x) => x.poolId === p.id);
                  setSelectedPositionId(first?.positionId ?? null);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${accentText[p.accent]}`}
                  >
                    {p.tierLabel}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-wide">
                    {p.name}
                  </h3>
                </div>
                {p.elite && (
                  <span className="rounded-full border border-purple/35 bg-purple/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-purple">
                    Elite
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.blurb}</p>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Expected APY
                  </p>
                  <p
                    className={`font-display text-3xl font-bold ${accentText[p.accent]}`}
                  >
                    ~{p.apyPercent}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Lock
                  </p>
                  <p
                    className={`mt-1 inline-flex items-center rounded-lg border px-2.5 py-1.5 font-display text-sm font-bold tracking-wide ${
                      p.lockDays === 0
                        ? "border-cyan/50 bg-cyan/20 text-cyan shadow-[0_0_12px_rgba(0,240,255,0.18)]"
                        : p.lockDays === 30
                          ? "border-green/50 bg-green/20 text-green shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                          : "border-purple/55 bg-purple/20 text-purple shadow-[0_0_16px_rgba(168,85,247,0.28)]"
                    }`}
                  >
                    {p.lockDays === 0 ? "None" : `${p.lockDays} days`}
                  </p>
                </div>
              </div>

              {p.minStakeNova ? (
                <p className="mt-3 font-mono text-[10px] text-purple/80">
                  Min stake {p.minStakeNova.toLocaleString()} NOVA
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    Your stake
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {formatNova(posStaked)} NOVA
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    Pool rewards
                  </p>
                  <p className="font-mono text-sm text-cyan">
                    {formatNova(posClaimable, 4)}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard strong>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
              Position console
            </p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-wide">
              {pool.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{pool.blurb}</p>
          </div>
          <p className="font-mono text-[11px] text-muted">
            {onChainMode
              ? selectedOnChain
                ? formatUnlockTs(selectedOnChain.unlockTimestamp, now)
                : "No open position in this pool"
              : formatUnlock(mockPosition.unlockAt, now)}
          </p>
        </div>

        {onChainMode && poolOnChain.length > 0 && (
          <div className="mt-4">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              On-chain position
            </label>
            <select
              value={selectedPositionId ?? ""}
              onChange={(e) =>
                setSelectedPositionId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="mt-2 w-full rounded-xl border border-white/12 bg-void/60 px-4 py-3 font-mono text-sm text-foreground outline-none ring-cyan/40 focus:border-cyan/40 focus:ring-1"
            >
              {poolOnChain.map((p) => (
                <option key={p.positionId} value={p.positionId}>
                  #{p.positionId} — {formatNova(p.amountNova)} NOVA · rewards{" "}
                  {formatNova(p.pendingRewardsNova, 4)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Amount (NOVA){onChainMode ? " — for stake" : ""}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/12 bg-void/60 px-4 py-3 font-mono text-sm text-foreground outline-none ring-cyan/40 focus:border-cyan/40 focus:ring-1"
                placeholder="0.00"
              />
              <GlowButton
                variant="ghost"
                className="!px-3 !py-3 !text-xs"
                onClick={setMaxStake}
              >
                Max stake
              </GlowButton>
              {!onChainMode && (
                <GlowButton
                  variant="ghost"
                  className="!px-3 !py-3 !text-xs"
                  onClick={setMaxUnstake}
                >
                  Max unstake
                </GlowButton>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(pool.minStakeNova
                ? [pool.minStakeNova, 25_000, 50_000]
                : [100, 500, 1000, 2500]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-muted transition hover:border-cyan/30 hover:text-cyan"
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Position snapshot
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[12px]">
              <li className="flex justify-between gap-2">
                <span className="text-muted">Staked</span>
                <span>
                  {formatNova(
                    onChainMode
                      ? (selectedOnChain?.amountNova ?? poolStaked)
                      : mockPosition.staked,
                  )}{" "}
                  NOVA
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted">Claimable</span>
                <span className="text-cyan">
                  {formatNova(
                    onChainMode
                      ? (selectedOnChain?.pendingRewardsNova ?? poolClaimable)
                      : mockPosition.claimable,
                    4,
                  )}{" "}
                  NOVA
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted">APY band</span>
                <span className={accentText[pool.accent]}>
                  ~{pool.apyPercent}%
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted">Status</span>
                <span>
                  {onChainMode
                    ? selectedOnChain
                      ? unlocked
                        ? "Unlocked"
                        : "Locked"
                      : "—"
                    : unlocked
                      ? "Unlocked"
                      : "Locked"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
          <GlowButton
            variant="cyan"
            onClick={() => void handleStake()}
            className={busy ? "pointer-events-none opacity-50" : ""}
          >
            {!isLoggedIn ? "Connect to Stake" : "Stake"}
          </GlowButton>
          <GlowButton
            variant="ghost"
            onClick={() => void handleUnstake()}
            className={
              busy ||
              !unlocked ||
              (onChainMode ? !selectedOnChain : mockPosition.staked <= 0)
                ? "pointer-events-none opacity-45"
                : ""
            }
          >
            Unstake{onChainMode && selectedOnChain ? ` #${selectedOnChain.positionId}` : ""}
          </GlowButton>
          <GlowButton
            variant="purple"
            onClick={() => void handleClaimPool()}
            className={
              busy ||
              (onChainMode
                ? !selectedOnChain || selectedOnChain.pendingRewardsNova <= 0
                : mockPosition.claimable <= 0)
                ? "pointer-events-none opacity-45"
                : ""
            }
          >
            Claim Pool
          </GlowButton>
        </div>
      </GlassCard>
    </div>
  );
}
