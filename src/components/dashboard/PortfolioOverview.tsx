"use client";

import { useEffect, useState } from "react";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { FormatAmountController } from "@multiversx/sdk-dapp/out/controllers/FormatAmountController";
import { DECIMALS, DIGITS } from "@multiversx/sdk-dapp-utils/out/constants";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { useMxReady } from "@/providers/MultiversXProvider";
import { useWalletUI } from "@/providers/WalletUIProvider";
import { fetchWalletTokenBalances } from "@/lib/mx/fetchBalances";
import { formatAddress, formatTokenAmount } from "@/lib/mx/format";
import {
  EXPLORER_URL,
  NOVA_PRICE_IN_USDC,
  NOVA_TOKEN_ID,
} from "@/config/network";

type PortfolioState = {
  nova: string;
  usdc: string;
  loading: boolean;
};

/**
 * Live $NOVA portfolio panel. Safe to mount before the MultiversX SDK is ready
 * — falls back to a connect CTA, then hydrates balances once logged in.
 */
export function PortfolioOverview() {
  const { ready } = useMxReady();

  if (!ready) {
    return <PortfolioIdle />;
  }

  return (
    <ClientErrorBoundary label="PortfolioOverview" fallback={<PortfolioIdle />}>
      <PortfolioReady />
    </ClientErrorBoundary>
  );
}

function PortfolioIdle() {
  const { openConnect, openBuyModal } = useWalletUI();

  return (
    <GlassCard strong>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
            Portfolio
          </p>
          <h2 className="mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl">
            Connect to load your $NOVA balance
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Link a MultiversX wallet to surface live holdings, USD valuation,
            and operator quick actions.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[180px]">
          <GlowButton variant="cyan" fullWidth onClick={openConnect}>
            Connect Wallet
          </GlowButton>
          <GlowButton variant="ghost" fullWidth onClick={openBuyModal}>
            Buy $NOVA
          </GlowButton>
        </div>
      </div>
    </GlassCard>
  );
}

function PortfolioReady() {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const {
    network: { egldLabel },
  } = useGetNetworkConfig();
  const { openConnect, openBuyModal } = useWalletUI();
  const [balances, setBalances] = useState<PortfolioState>({
    nova: "0",
    usdc: "0",
    loading: false,
  });

  useEffect(() => {
    if (!isLoggedIn || !account.address) {
      setBalances({ nova: "0", usdc: "0", loading: false });
      return;
    }

    let cancelled = false;
    setBalances((prev) => ({ ...prev, loading: true }));

    void (async () => {
      try {
        const { usdc, nova } = await fetchWalletTokenBalances(account.address);
        if (cancelled) return;
        setBalances({
          nova: formatTokenAmount(nova.balance, nova.decimals, 2),
          usdc: formatTokenAmount(usdc.balance, usdc.decimals, 2),
          loading: false,
        });
      } catch (err) {
        console.error("[NOVA] Failed to load portfolio balances", err);
        if (!cancelled) {
          setBalances({ nova: "0", usdc: "0", loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, account.address]);

  if (!isLoggedIn) {
    return <PortfolioIdle />;
  }

  const egldFormatted = FormatAmountController.getData({
    input: account.balance || "0",
    decimals: DECIMALS,
    digits: DIGITS,
    egldLabel,
  });
  const egldDisplay = egldFormatted.isValid
    ? `${egldFormatted.valueInteger}${egldFormatted.valueDecimal}`
    : "0";

  const novaNumeric = Number(balances.nova.replace(/,/g, "")) || 0;
  const usdValue = (novaNumeric * NOVA_PRICE_IN_USDC).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-4">
      <GlassCard strong>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
              Portfolio
            </p>
            <h2 className="mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl">
              Operator holdings
            </h2>
            <a
              href={`${EXPLORER_URL}/accounts/${account.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-mono text-xs text-muted transition-colors hover:text-cyan"
            >
              {formatAddress(account.address, 6)}
            </a>
          </div>
          <div className="flex gap-2">
            <GlowButton
              variant="cyan"
              className="!px-4 !py-2.5 !text-xs"
              onClick={openBuyModal}
            >
              Buy $NOVA
            </GlowButton>
            <GlowButton
              variant="ghost"
              className="!px-4 !py-2.5 !text-xs"
              onClick={openConnect}
            >
              Switch Wallet
            </GlowButton>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`${NOVA_TOKEN_ID.split("-")[0]} Balance`}
          value={balances.loading ? "…" : balances.nova}
          hint={NOVA_TOKEN_ID}
          tone="cyan"
          delay={0.05}
        />
        <StatCard
          label="USD Valuation"
          value={balances.loading ? "…" : `$${usdValue}`}
          hint={`@ ${NOVA_PRICE_IN_USDC} USDC / NOVA`}
          tone="green"
          delay={0.1}
        />
        <StatCard
          label="USDC Balance"
          value={balances.loading ? "…" : balances.usdc}
          hint="USDC-c76f1f"
          tone="purple"
          delay={0.15}
        />
        <StatCard
          label={`${egldLabel} Balance`}
          value={egldDisplay}
          hint="Gas & settlement"
          tone="neutral"
          delay={0.2}
        />
      </div>
    </div>
  );
}
