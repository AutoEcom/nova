/**
 * Primary site navigation — desktop navbar + mobile drawer.
 * Keep Tokenomics / Referrals out of the top bar (footer-only).
 */

export type SiteNavLink = {
  href: string;
  label: string;
};

/** Top navbar + mobile drawer — product surfaces only. */
export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  { href: "/dashboard/staking", label: "Staking" },
  { href: "/dashboard/agents", label: "Agents" },
] as const;

/** Footer Protocol column — full site map including Tokenomics & Referrals. */
export const SITE_FOOTER_LINKS: readonly SiteNavLink[] = [
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/dashboard/staking", label: "Staking" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/agents", label: "Agents" },
] as const;
