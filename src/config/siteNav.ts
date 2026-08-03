/**
 * Primary site navigation — desktop navbar + mobile drawer.
 * Keep in sync across landing chrome so routes never drift.
 */

export type SiteNavLink = {
  href: string;
  label: string;
};

export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/dashboard/staking", label: "Staking" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/agents", label: "Agents" },
] as const;
