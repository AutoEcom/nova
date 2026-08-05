/**
 * Dashboard information architecture.
 *
 * Single source of truth for the dashboard sections — consumed by the sidebar,
 * the mobile section nav, and page metadata so routes never drift out of sync.
 */

export type DashboardStatus = "live" | "in-progress" | "coming-soon";

export type DashboardSection = "overview" | "agents" | "staking" | "referrals";

export type DashboardNavItem = {
  id: DashboardSection;
  label: string;
  href: string;
  status: DashboardStatus;
  /** Short supporting copy shown in the sidebar. */
  description: string;
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/dashboard",
    status: "live",
    description: "Portfolio & AI performance",
  },
  {
    id: "agents",
    label: "Agents",
    href: "/dashboard/agents",
    status: "live",
    description: "Marketplace & terminals",
  },
  {
    id: "staking",
    label: "Staking",
    href: "/dashboard/staking",
    status: "live",
    description: "Pools & protocol yield",
  },
  {
    id: "referrals",
    label: "Referrals",
    href: "/dashboard/referrals",
    status: "live",
    description: "Invite & earn $NOVA",
  },
] as const;

export const STATUS_LABEL: Record<DashboardStatus, string> = {
  live: "Live",
  "in-progress": "In Progress",
  "coming-soon": "Coming Soon",
};

/** Neon tone mapped to each lifecycle status. */
export type StatusTone = "green" | "cyan" | "purple";

export const STATUS_TONE: Record<DashboardStatus, StatusTone> = {
  live: "green",
  "in-progress": "cyan",
  "coming-soon": "purple",
};
