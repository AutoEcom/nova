"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ComingSoonPanel } from "@/components/dashboard/ComingSoonPanel";

const BOT_SLOTS = [
  {
    id: "local",
    title: "Local Agent",
    blurb:
      "Run EVOLGO bots on your own hardware with non-custodial signing. Ideal for operators who want full key control.",
    status: "in-progress" as const,
    progress: 54,
    features: ["Hardware key signing", "Offline strategy packs", "Local risk caps"],
  },
  {
    id: "cloud",
    title: "Cloud Fleet",
    blurb:
      "Managed MultiversX-native execution with auto-scaling workers. Activate once cloud orchestration clears QA.",
    status: "coming-soon" as const,
    progress: 31,
    features: ["Auto-scaling workers", "Shared signal bus", "Remote kill-switch"],
  },
] as const;

export function BotsManagement() {
  return (
    <ComingSoonPanel
      eyebrow="AI Bots"
      title="Bot management console"
      description="Deploy, monitor, and terminate algorithmic agents across local and cloud runtimes. Activation unlocks with the Intelligence Core release."
      status="in-progress"
      progress={48}
      features={[
        "Strategy marketplace",
        "Risk parameter templates",
        "Live PnL telemetry",
        "One-tap kill switch",
        "Webhook alerts",
        "Multi-wallet routing",
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {BOT_SLOTS.map((slot, i) => (
          <GlassCard key={slot.id} delay={0.08 * i} className="!p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-semibold tracking-wide">
                {slot.title}
              </h3>
              <StatusBadge status={slot.status} />
            </div>
            <p className="text-sm leading-relaxed text-muted">{slot.blurb}</p>
            <ul className="mt-4 space-y-1.5">
              {slot.features.map((f) => (
                <li
                  key={f}
                  className="font-mono text-[11px] text-foreground/85"
                >
                  <span className="mr-1.5 text-cyan">▸</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <ProgressBar
                label="Activation readiness"
                status={
                  slot.status === "in-progress" ? "In Progress" : "Coming Soon"
                }
                progress={slot.progress}
                tone={slot.status === "in-progress" ? "cyan" : "purple"}
              />
            </div>
            <GlowButton
              variant="ghost"
              fullWidth
              className="mt-4 !py-2.5 !text-xs opacity-60"
              onClick={() => undefined}
            >
              Activate — {slot.status === "in-progress" ? "Soon" : "Locked"}
            </GlowButton>
          </GlassCard>
        ))}
      </div>
    </ComingSoonPanel>
  );
}
