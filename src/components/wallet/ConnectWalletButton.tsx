"use client";

import { useCallback } from "react";
import { getAccountProvider } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { GlowButton } from "@/components/ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";
import { useMxReady } from "@/providers/MultiversXProvider";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { AccountBadge } from "./AccountBadge";
import { formatAddress } from "@/lib/mx/format";
import { EXPLORER_URL } from "@/config/network";

type ConnectWalletButtonProps = {
  variant?: "cyan" | "purple" | "ghost";
  fullWidth?: boolean;
  className?: string;
  connectLabel?: string;
  showAccount?: boolean;
  /** Slim address chip for navbar — avoids crushing the glass bar */
  compact?: boolean;
};

/**
 * Public entry. Renders a visible button in every state, but only touches the
 * wallet store hooks once the sdk-dapp store is initialized — so the navbar
 * button is always present, never blocked on SDK boot.
 */
export function ConnectWalletButton(props: ConnectWalletButtonProps) {
  const { ready } = useMxReady();

  if (!ready) {
    return <ConnectWalletButtonIdle {...props} />;
  }

  // If any wallet hook / SDK call throws, fall back to the static button
  // instead of letting the error unmount the navbar.
  return (
    <ClientErrorBoundary
      label="ConnectWalletButton"
      fallback={<ConnectWalletButtonIdle {...props} />}
    >
      <ConnectWalletButtonReady {...props} />
    </ClientErrorBoundary>
  );
}

function ConnectWalletButtonIdle({
  variant = "ghost",
  fullWidth,
  className = "",
  connectLabel = "Connect Wallet",
}: ConnectWalletButtonProps) {
  const { openConnect } = useWalletUI();

  return (
    <GlowButton
      variant={variant}
      fullWidth={fullWidth}
      className={className}
      onClick={openConnect}
    >
      {connectLabel}
    </GlowButton>
  );
}

function ConnectWalletButtonReady({
  variant = "ghost",
  fullWidth,
  className = "",
  connectLabel = "Connect Wallet",
  showAccount = true,
  compact = false,
}: ConnectWalletButtonProps) {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();

  const handleLogout = useCallback(async () => {
    try {
      const provider = getAccountProvider();
      await provider.logout();
    } catch (err) {
      console.error("[NOVA] Logout failed", err);
    }
  }, []);

  if (isLoggedIn && compact) {
    return (
      <div
        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-cyan/25 bg-cyan/10 px-2 py-1 md:gap-2 md:px-2.5 md:py-1.5 ${fullWidth ? "w-full justify-between" : ""} ${className}`}
      >
        <a
          href={`${EXPLORER_URL}/accounts/${account.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[7.5rem] truncate font-mono text-[10px] tracking-wide text-cyan touch-manipulation md:max-w-none md:text-[11px]"
          title={account.address}
        >
          {formatAddress(account.address, 4)}
        </a>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Disconnect wallet"
          className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-magenta touch-manipulation md:rounded-lg md:px-2 md:py-1"
        >
          <span className="md:hidden" aria-hidden>
            ×
          </span>
          <span className="max-md:hidden">Exit</span>
        </button>
      </div>
    );
  }

  if (isLoggedIn && showAccount) {
    return <AccountBadge onDisconnect={handleLogout} className={className} />;
  }

  if (isLoggedIn) {
    return (
      <GlowButton
        variant={variant}
        fullWidth={fullWidth}
        className={className}
        onClick={handleLogout}
      >
        Disconnect
      </GlowButton>
    );
  }

  return (
    <GlowButton
      variant={variant}
      fullWidth={fullWidth}
      className={className}
      onClick={openConnect}
    >
      {connectLabel}
    </GlowButton>
  );
}
