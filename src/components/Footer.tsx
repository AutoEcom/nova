"use client";

import Link from "next/link";
import { SITE_FOOTER_LINKS } from "@/config/siteNav";
import { EXPLORER_URL, NOVA_TOKEN_ID, TREASURY_ADDRESS } from "@/config/network";

/** Official X logo (Wikimedia: X_logo_2023.svg) — monochrome via currentColor. */
function IconX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 271"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="m236 0h46l-101 115 118 156h-92.6l-72.5-94.8-83 94.8h-46l107-123-113-148h94.9l65.5 86.6zm-16.1 244h25.5l-165-218h-27.4z"
      />
    </svg>
  );
}

/** Official Telegram logo (Wikimedia: Telegram_logo.svg). */
function IconTelegram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="evolgo-tg-grad"
          x1="120"
          y1="240"
          x2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1d93d2" />
          <stop offset="1" stopColor="#38b0e3" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#evolgo-tg-grad)" />
      <path
        d="M81.229,128.772l14.237,39.406s1.78,3.687,3.686,3.687,30.255-29.492,30.255-29.492l31.525-60.89L81.737,118.6Z"
        fill="#c8daea"
      />
      <path
        d="M100.106,138.878l-2.733,29.046s-1.144,8.9,7.754,0,17.415-15.763,17.415-15.763"
        fill="#a9c6d8"
      />
      <path
        d="M81.486,130.178,52.2,120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229,2.1-2.2,6.489-4.523,120.106-45.36,120.106-45.36s3.208-1.081,5.1-.362a2.766,2.766,0,0,1,1.885,2.055,9.357,9.357,0,0,1,.254,2.585c-.009.752-.1,1.449-.169,2.542-.692,11.165-21.4,94.493-21.4,94.493s-1.239,4.876-5.678,5.043A8.13,8.13,0,0,1,146.1,172.5c-8.711-7.493-38.819-27.727-45.472-32.177a1.27,1.27,0,0,1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6,53.821-51.492c.108-.379-.3-.566-.848-.4-3.482,1.281-63.844,39.4-70.506,43.607A3.21,3.21,0,0,1,81.486,130.178Z"
        fill="#fff"
      />
    </svg>
  );
}

const socials = [
  {
    name: "X",
    href: "https://x.com/evolgoapp",
    label: "Follow EVOLGO on X",
    icon: <IconX className="block h-4 w-4 shrink-0" />,
  },
  {
    name: "Telegram",
    href: "https://t.me/evolgoapp",
    label: "Join EVOLGO on Telegram",
    icon: <IconTelegram className="block h-4 w-4 shrink-0" />,
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
                  className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-foreground transition-all hover:border-cyan/40 hover:text-cyan hover:shadow-[0_0_16px_rgba(0,240,255,0.18)] touch-manipulation [&_svg]:transition-transform hover:[&_svg]:scale-105"
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
              {SITE_FOOTER_LINKS.map((link) => (
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
