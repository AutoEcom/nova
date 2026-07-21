"use client";

import { useEffect, useState } from "react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { FormatAmountController } from "@multiversx/sdk-dapp/out/controllers/FormatAmountController";
import { DECIMALS, DIGITS } from "@multiversx/sdk-dapp-utils/out/constants";
import { EXPLORER_URL, NOVA_TOKEN_ID } from "@/config/network";
import { formatAddress, formatTokenAmount } from "@/lib/mx/format";
import { fetchWalletTokenBalances } from "@/lib/mx/fetchBalances";

type AccountBadgeProps = {
  onDisconnect: () => void;
  className?: string;
};

export function AccountBadge({ onDisconnect, className = "" }: AccountBadgeProps) {
  const account = useGetAccount();
  const {
    network: { egldLabel },
  } = useGetNetworkConfig();
  const [novaBalance, setNovaBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");

  const egldFormatted = FormatAmountController.getData({
    input: account.balance || "0",
    decimals: DECIMALS,
    digits: DIGITS,
    egldLabel,
  });

  useEffect(() => {
    if (!account.address) return;
    let cancelled = false;

    void (async () => {
      try {
        const { usdc, nova } = await fetchWalletTokenBalances(account.address);
        if (cancelled) return;
        setUsdcBalance(formatTokenAmount(usdc.balance, usdc.decimals, 2));
        setNovaBalance(formatTokenAmount(nova.balance, nova.decimals, 2));
      } catch (err) {
        console.error("[NOVA] Failed to load token balances", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account.address]);

  return (
    <div
      className={`glass flex max-w-full items-center gap-2 rounded-xl px-2.5 py-1.5 sm:gap-3 sm:px-3 ${className}`}
    >
      <a
        href={`${EXPLORER_URL}/accounts/${account.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 touch-manipulation"
      >
        <p className="font-mono text-[11px] font-medium tracking-wide text-cyan sm:text-xs">
          {formatAddress(account.address, 5)}
        </p>
        <p className="truncate font-mono text-[10px] text-muted">
          {egldFormatted.isValid
            ? `${egldFormatted.valueInteger}${egldFormatted.valueDecimal} ${egldLabel}`
            : `0 ${egldLabel}`}
          {" · "}
          {usdcBalance} USDC
          {" · "}
          {novaBalance} {NOVA_TOKEN_ID.split("-")[0]}
        </p>
      </a>
      <button
        type="button"
        onClick={onDisconnect}
        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-magenta/40 hover:text-magenta touch-manipulation"
      >
        Exit
      </button>
    </div>
  );
}
