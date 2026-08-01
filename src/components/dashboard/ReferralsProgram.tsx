"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";
import {
  REFERRAL_TIERS,
  buildInviteUrl,
  getReferralTier,
} from "@/config/referrals";
import { NOVA_DECIMALS } from "@/config/network";

const FEATURE_CARDS = [
  {
    title: "Tactical invite links",
    body: "A private command channel — compact codes built for instant deployment across operators and networks.",
  },
  {
    title: "Live network ledger",
    body: "Every attributed acquisition surfaces in real time, giving you a clear signal of network expansion.",
  },
  {
    title: "Wallet-bound attribution",
    body: "Rewards follow cryptographic identity, not cookies alone — sealed to MultiversX wallet signatures.",
  },
  {
    title: "Tiered yield authority",
    body: "Ascend from Operator to Syndicate and compound your permanent cut of protocol volume.",
  },
  {
    title: "Treasury-routed payouts",
    body: "Claim accrued $NOVA on demand — routed straight from the protocol treasury to your wallet.",
  },
  {
    title: "Operator leaderboards",
    body: "Weekly rankings spotlight high-velocity networks and unlock performance-weighted bonus allocations.",
  },
] as const;

type ReferralMeResponse = {
  ok?: boolean;
  code?: string;
  inviteUrl?: string;
  tier?: string;
  tierLabel?: string;
  rewardPercent?: number;
  stats?: {
    attributedBuys?: number;
    totalRewardAtomic?: string;
    claimableBalance?: number;
    totalClaimed?: number;
  };
  error?: string;
};

function formatNovaAtomic(atomic: string | undefined): string {
  try {
    const value = BigInt(atomic ?? "0");
    const base = BigInt(10) ** BigInt(NOVA_DECIMALS);
    const whole = value / base;
    const frac = value % base;
    if (frac === BigInt(0)) return whole.toLocaleString();
    const fracStr = frac
      .toString()
      .padStart(NOVA_DECIMALS, "0")
      .replace(/0+$/, "")
      .slice(0, 4);
    return `${whole.toLocaleString()}.${fracStr}`;
  } catch {
    return "0";
  }
}

function formatNovaHuman(amount: number | undefined): string {
  if (!Number.isFinite(amount) || !amount) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function ReferralsProgram() {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [rewardPercent, setRewardPercent] = useState(
    getReferralTier().rewardPercent,
  );
  const [tierLabel, setTierLabel] = useState(getReferralTier().label);
  const [stats, setStats] = useState({
    buys: 0,
    rewardNova: "0",
    claimable: 0,
    claimed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/referrals/me?address=${encodeURIComponent(address)}`,
      );
      const json = (await res.json()) as ReferralMeResponse;
      if (!res.ok || !json.ok || !json.code) {
        throw new Error(json.error ?? "Unable to load invite code");
      }
      setCode(json.code);
      setInviteUrl(json.inviteUrl ?? buildInviteUrl(json.code));
      setTierLabel(json.tierLabel ?? "Operator");
      setRewardPercent(json.rewardPercent ?? 7.5);
      setStats({
        buys: json.stats?.attributedBuys ?? 0,
        rewardNova: formatNovaAtomic(json.stats?.totalRewardAtomic),
        claimable: Number(json.stats?.claimableBalance ?? 0),
        claimed: Number(json.stats?.totalClaimed ?? 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && account.address) {
      void loadProfile(account.address);
    } else {
      setCode(null);
      setInviteUrl(null);
      setStats({ buys: 0, rewardNova: "0", claimable: 0, claimed: 0 });
    }
  }, [isLoggedIn, account.address, loadProfile]);

  const displayUrl = useMemo(
    () => inviteUrl ?? "Connect wallet to generate your invite link",
    [inviteUrl],
  );

  const canClaim = isLoggedIn && stats.claimable > 0 && !claiming;

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard unavailable — copy the link manually");
    }
  }, [inviteUrl]);

  const handleClaim = useCallback(async () => {
    if (!account.address || !canClaim) return;
    setClaiming(true);
    setError(null);
    setClaimMessage(null);
    try {
      const res = await fetch("/api/referrals/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        claimTxHash?: string;
        claimedNova?: number;
        claimableBalance?: number;
        totalClaimed?: number;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Claim failed");
      }
      setStats((prev) => ({
        ...prev,
        claimable: Number(json.claimableBalance ?? 0),
        claimed: Number(json.totalClaimed ?? prev.claimed),
      }));
      setClaimMessage(
        json.claimTxHash
          ? `Claimed ${formatNovaHuman(json.claimedNova)} NOVA`
          : "Rewards claimed",
      );
      await loadProfile(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }, [account.address, canClaim, loadProfile]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
          Referrals
        </p>
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
          COMMAND THE NETWORK. EARN $NOVA.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Share your tactical invite code, onboard high-performance operators,
          and secure a permanent cut of protocol activity.
        </p>
      </div>

      <GlassCard strong>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
              Personal invite link
            </p>
            <p className="mt-2 break-all font-mono text-sm text-foreground sm:text-base">
              {loading ? "Provisioning code…" : displayUrl}
            </p>
            {code && (
              <p className="mt-2 font-mono text-[11px] text-muted">
                Code <span className="text-cyan">{code}</span> · {tierLabel} tier ·{" "}
                {rewardPercent}% $NOVA on attributed buys
              </p>
            )}
            {error && (
              <p className="mt-2 font-mono text-[11px] text-magenta">{error}</p>
            )}
            {claimMessage && !error && (
              <p className="mt-2 font-mono text-[11px] text-green">{claimMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isLoggedIn ? (
              <GlowButton variant="cyan" onClick={() => openConnect()}>
                Connect to Get Code
              </GlowButton>
            ) : (
              <GlowButton
                variant="cyan"
                onClick={handleCopy}
                className={!inviteUrl ? "pointer-events-none opacity-50" : ""}
              >
                {copied ? "Copied!" : "Copy Link"}
              </GlowButton>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <div className="mt-6 space-y-4 border-t border-white/8 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Tier
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-cyan">
                  {tierLabel}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Attributed buys
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {stats.buys}
                </p>
              </div>
              <div className="rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
                  Claimable
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {formatNovaHuman(stats.claimable)}{" "}
                  <span className="text-sm text-muted">NOVA</span>
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Lifetime earned
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {stats.rewardNova}{" "}
                  <span className="text-sm text-muted">NOVA</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] text-muted">
                Claimed to date:{" "}
                <span className="text-foreground">
                  {formatNovaHuman(stats.claimed)} NOVA
                </span>
              </p>
              <GlowButton
                variant="purple"
                onClick={handleClaim}
                className={!canClaim ? "pointer-events-none opacity-45" : ""}
              >
                {claiming ? "Claiming…" : "Claim Rewards"}
              </GlowButton>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-sm font-semibold tracking-wide">
          Network Features
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURE_CARDS.map((feature, i) => (
            <GlassCard key={feature.title} delay={0.05 * i} className="!p-4">
              <p className="font-display text-sm font-semibold tracking-wide">
                {feature.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wide">
              Reward tiers
            </h2>
            <p className="mt-1 text-sm text-muted">
              Scale network status for higher $NOVA yield. Operator is live now.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {REFERRAL_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-xl border px-4 py-4 ${
                tier.active
                  ? "border-cyan/35 bg-cyan/10"
                  : "border-white/8 bg-white/[0.03] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-semibold">
                  {tier.label}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                  {tier.active ? "Active" : "Soon"}
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-cyan">
                {tier.rewardPercent}%
              </p>
              <p className="mt-1 text-sm text-muted">{tier.blurb}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
