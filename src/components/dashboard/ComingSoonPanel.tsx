"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { DashboardStatus } from "@/config/dashboard";
import type { ReactNode } from "react";

type ComingSoonPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: Extract<DashboardStatus, "in-progress" | "coming-soon">;
  progress: number;
  features: readonly string[];
  children?: ReactNode;
};

/**
 * Shared "module under construction" panel used by Agents / Staking modules.
 * Keeps the Coming Soon / In Progress presentation consistent across routes.
 */
export function ComingSoonPanel({
  eyebrow,
  title,
  description,
  status,
  progress,
  features,
  children,
}: ComingSoonPanelProps) {
  const tone = status === "in-progress" ? "cyan" : "purple";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
            {eyebrow}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {description}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <GlassCard strong>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wide text-foreground">
              What&apos;s shipping
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 font-mono text-[11px] text-foreground/90"
                >
                  <span className="mr-1.5 text-green">▸</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-end">
            <ProgressBar
              label="Module readiness"
              status={status === "in-progress" ? "In Progress" : "Coming Soon"}
              progress={progress}
              tone={tone}
            />
          </div>
        </div>

        {children && <div className="mt-6 border-t border-white/8 pt-6">{children}</div>}
      </GlassCard>
    </div>
  );
}
