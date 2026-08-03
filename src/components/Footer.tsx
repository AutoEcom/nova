"use client";

import Link from "next/link";
import { SITE_NAV_LINKS } from "@/config/siteNav";
import { EXPLORER_URL, NOVA_TOKEN_ID, TREASURY_ADDRESS } from "@/config/network";

const socials = [
  {
    name: "X",
    href: "https://x.com/evolgoapp",
    label: "Follow EVOLGO on X",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="block h-4 w-4 shrink-0 fill-current"
        aria-hidden
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.839L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/evolgoapp",
    label: "Join EVOLGO on Telegram",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="block h-4 w-4 shrink-0 fill-current"
        aria-hidden
      >
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.458.02.889-.15 1.562-.788 5.36-.788 5.36s-.062.246-.288.255c-.143.006-.33-.056-.33-.056l-1.86-1.22-1.01.97a.35.35 0 0 1-.26.107l.14-1.98 3.62-3.27c.16-.14-.035-.217-.247-.08l-4.47 2.81-1.93-.6s-.3-.094-.31-.3c-.01-.17.16-.26.16-.26l7.52-2.9z" />
      </svg>
    ),
  },
];

const resourceLinks = [
  { href: "/docs", label: "Documentation", soon: true },
  {
    href: `${EXPLORER_URL}/tokens/${NOVA_TOKEN_ID}`,
    label: "MultiversX Explorer ($NOVA)",
    external: true,
  },
  {
    href: `${EXPLORER_URL}/accounts/${TREASURY_ADDRESS}`,
    label: "Smart Contracts",
    external: true,
  },
] as const;

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Service", soon: true },
  { href: "/legal/privacy", label: "Privacy Policy", soon: true },
  { href: "/legal/risk", label: "Risk Disclosure", soon: true },
] as const;

function SoonBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded border border-purple/35 bg-purple/15 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-purple/90">
      Soon
    </span>
  );
}

function FooterLink({
  href,
  label,
  external,
  soon,
}: {
  href: string;
  label: string;
  external?: boolean;
  soon?: boolean;
}) {
  const className =
    "inline-flex items-center font-mono text-[12px] text-muted transition-colors hover:text-cyan";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
        {soon ? <SoonBadge /> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
      {soon ? <SoonBadge /> : null}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/10 bg-void/40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-14 sm:px-6 sm:pb-12 sm:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="group inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/15 font-display text-sm font-bold text-cyan btn-glow-cyan">
                E
              </span>
              <span className="font-display text-lg font-bold tracking-[0.2em] text-foreground transition-colors group-hover:text-cyan">
                EVOLGO
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Evolgo — The Engine of Autonomous Wealth & Protocol Intelligence
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-foreground transition-all hover:border-cyan/40 hover:text-cyan touch-manipulation"
                >
                  {s.icon}
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    {s.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Protocol */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
              Protocol
            </p>
            <ul className="mt-4 space-y-2.5">
              {SITE_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
              Resources
            </p>
            <ul className="mt-4 space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink
                    href={link.href}
                    label={link.label}
                    external={"external" in link ? link.external : false}
                    soon={"soon" in link ? link.soon : false}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
              Legal & Compliance
            </p>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink
                    href={link.href}
                    label={link.label}
                    soon={link.soon}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-muted">
            Copyright © 2026 Evolgo. All rights reserved.
          </p>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] text-muted">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-green shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse"
              aria-hidden
            />
            <span>
              Mainnet Operational —{" "}
              <span className="text-cyan">MultiversX</span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
