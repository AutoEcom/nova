import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";

export const metadata: Metadata = {
  title: "Dashboard | EVOLGO — Powered by $NOVA",
  description:
    "EVOLGO operator console — portfolio overview, AI trading performance, bots, staking, and referrals powered by $NOVA on MultiversX.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ClientErrorBoundary
      label="DashboardShell"
      fallback={
        <div className="flex min-h-dvh items-center justify-center px-4">
          <p className="font-mono text-sm text-magenta">
            Dashboard failed to load. Refresh to retry.
          </p>
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </ClientErrorBoundary>
  );
}
