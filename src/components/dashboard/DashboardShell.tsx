"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { NOVA_TOKEN_ID } from "@/config/network";

type DashboardShellProps = {
  children: ReactNode;
};

/**
 * Dashboard module chrome — sidebar + mobile section strip.
 * Global Evolgo Navbar / Footer come from SiteChrome in the root layout.
 * Agents marketplace uses a full-width layout (no module sidebar).
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const fullWidth =
    pathname === "/dashboard/agents" || pathname?.startsWith("/dashboard/agents/");

  return (
    <div
      className={`mx-auto flex w-full flex-1 gap-6 px-3 pb-10 pt-24 sm:px-4 md:px-6 md:pt-28 ${
        fullWidth ? "max-w-6xl lg:max-w-7xl" : "max-w-7xl"
      }`}
    >
      {!fullWidth && (
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
                {NOVA_TOKEN_ID}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                MultiversX Mainnet
              </p>
            </div>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        {!fullWidth && (
          <div className="mb-4 md:hidden">
            <DashboardNav orientation="horizontal" />
          </div>
        )}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
