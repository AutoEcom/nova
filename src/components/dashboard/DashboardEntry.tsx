"use client";

import Link from "next/link";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { useMxReady } from "@/providers/MultiversXProvider";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";

type DashboardEntryProps = {
  className?: string;
  onNavigate?: () => void;
  /** Compact chip for the desktop navbar; larger row for the mobile drawer. */
  compact?: boolean;
};

/**
 * Surfaces a Dashboard shortcut once a MultiversX wallet is connected.
 * Renders nothing while the SDK boots or the user is logged out, so the
 * landing chrome stays untouched for anonymous visitors.
 */
export function DashboardEntry(props: DashboardEntryProps) {
  const { ready } = useMxReady();
  if (!ready) return null;

  return (
    <ClientErrorBoundary label="DashboardEntry" fallback={null}>
      <DashboardEntryReady {...props} />
    </ClientErrorBoundary>
  );
}

function DashboardEntryReady({
  className = "",
  onNavigate,
  compact = false,
}: DashboardEntryProps) {
  const isLoggedIn = useGetIsLoggedIn();
  if (!isLoggedIn) return null;

  if (compact) {
    return (
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`inline-flex items-center rounded-xl border border-purple/35 bg-purple/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-purple transition-colors hover:bg-purple/20 touch-manipulation ${className}`}
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={`rounded-xl border border-purple/30 bg-purple/10 px-3 py-3 text-center font-mono text-sm uppercase tracking-wider text-purple transition-colors hover:bg-purple/20 touch-manipulation ${className}`}
    >
      Open Dashboard
    </Link>
  );
}
