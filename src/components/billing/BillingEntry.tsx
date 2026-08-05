"use client";

import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { GlowButton } from "@/components/ui/GlowButton";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { useMxReady } from "@/providers/MultiversXProvider";
import { useWalletUI } from "@/providers/WalletUIProvider";

type BillingEntryProps = {
  /** Compact chip for the desktop navbar; full-width for the mobile drawer. */
  compact?: boolean;
  onNavigate?: () => void;
};

/**
 * Billing shortcut — only when a MultiversX wallet session is active.
 * Hidden while the SDK boots or the user is logged out (same rule as Dashboard).
 */
export function BillingEntry(props: BillingEntryProps) {
  const { ready } = useMxReady();
  if (!ready) return null;

  return (
    <ClientErrorBoundary label="BillingEntry" fallback={null}>
      <BillingEntryReady {...props} />
    </ClientErrorBoundary>
  );
}

function BillingEntryReady({
  compact = false,
  onNavigate,
}: BillingEntryProps) {
  const isLoggedIn = useGetIsLoggedIn();
  const { openBillingModal } = useWalletUI();

  if (!isLoggedIn) return null;

  if (compact) {
    return (
      <GlowButton
        variant="ghost"
        className="!px-4 !py-2.5 !text-xs"
        onClick={() => {
          onNavigate?.();
          openBillingModal();
        }}
      >
        Billing
      </GlowButton>
    );
  }

  return (
    <GlowButton
      variant="ghost"
      fullWidth
      onClick={() => {
        onNavigate?.();
        openBillingModal();
      }}
    >
      Billing & Subscriptions
    </GlowButton>
  );
}
