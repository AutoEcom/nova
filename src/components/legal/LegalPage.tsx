import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

/** Shared chrome for Terms / Privacy / Risk disclosure pages. */
export function LegalPage({ eyebrow, title, children }: LegalPageProps) {
  return (
    <main className="flex-1 px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-wide sm:text-4xl">
          {title}
        </h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted sm:text-base">
          {children}
        </div>
        <p className="mt-10 font-mono text-[11px] text-muted">
          <Link href="/" className="text-cyan hover:text-foreground">
            ← Back to Evolgo
          </Link>
        </p>
      </div>
    </main>
  );
}
