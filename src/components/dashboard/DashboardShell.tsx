"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { GlowButton } from "@/components/ui/GlowButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useWalletUI } from "@/providers/WalletUIProvider";

type DashboardShellProps = {
  children: ReactNode;
};

/**
 * Persistent chrome for every `/dashboard/*` route: glass topbar, desktop
 * sidebar, and a mobile section strip. Wallet + Buy CTAs stay reachable from
 * every view so operators never have to bounce back to the landing page.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const { openBuyModal } = useWalletUI();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pointer-events-none sticky top-0 z-[55]">
        <div className="pointer-events-auto glass-strong mx-3 mt-3 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:mx-4 md:mx-auto md:max-w-7xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="group flex items-center gap-2"
                suppressHydrationWarning
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 font-display text-sm font-bold text-cyan btn-glow-cyan">
                  E
                </span>
                <span className="font-display text-base font-bold tracking-[0.2em] text-foreground transition-colors group-hover:text-cyan">
                  EVOLGO
                </span>
              </Link>
              <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:inline">
                Powered by $NOVA
              </span>
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
              <Link
                href="/#tokenomics"
                className="hidden font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-cyan md:inline"
              >
                Landing
              </Link>
              {/* Hidden below md so the wallet chip has room; desktop unchanged */}
              <GlowButton
                variant="cyan"
                className="max-md:!hidden !px-3 !py-2 !text-[11px] sm:!px-4 sm:!py-2.5 sm:!text-xs"
                onClick={openBuyModal}
              >
                Buy $NOVA
              </GlowButton>
              <ConnectWalletButton
                variant="ghost"
                compact
                className="!px-2 !py-1 !text-[10px] sm:!px-4 sm:!py-2.5 sm:!text-xs"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 pb-10 pt-5 sm:px-4 md:px-6 md:pt-8">
        <aside className="dash-sidebar w-60 shrink-0 flex-col">
          <div className="glass sticky top-24 flex flex-col rounded-2xl p-3">
            <p className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              Modules
            </p>
            <DashboardNav orientation="vertical" />
            <div className="mt-4 border-t border-white/8 px-2 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                EVOLGO · Powered by $NOVA
              </p>
              <p className="mt-1 font-display text-sm font-semibold tracking-wide text-cyan">
                NOVA-04c5f5
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                MultiversX Mainnet
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 md:hidden">
            <DashboardNav orientation="horizontal" />
          </div>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
