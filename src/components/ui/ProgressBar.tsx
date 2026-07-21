"use client";

import { motion } from "framer-motion";

type ProgressTone = "cyan" | "purple" | "green";

type ProgressBarProps = {
  label: string;
  status: string;
  progress: number;
  tone?: ProgressTone;
};

const fillClass: Record<ProgressTone, string> = {
  cyan: "progress-fill-cyan",
  purple: "progress-fill-purple",
  green: "progress-fill-green",
};

const statusColor: Record<ProgressTone, string> = {
  cyan: "text-cyan",
  purple: "text-purple",
  green: "text-green",
};

export function ProgressBar({
  label,
  status,
  progress,
  tone = "cyan",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold tracking-wide">
          {label}
        </span>
        <span
          className={`font-mono text-[11px] uppercase tracking-wider ${statusColor[tone]} animate-pulse-glow`}
        >
          {status}
        </span>
      </div>
      <div className="progress-track relative h-2.5 overflow-hidden rounded-full">
        <motion.div
          className={`h-full rounded-full ${fillClass[tone]}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <motion.div
          className={`absolute top-0 h-full w-8 rounded-full opacity-60 ${fillClass[tone]} blur-sm`}
          initial={{ left: 0 }}
          whileInView={{ left: `calc(${clamped}% - 1rem)` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{ maxWidth: "2rem" }}
        />
      </div>
      <p className="font-mono text-[11px] text-muted">{clamped}% complete</p>
    </div>
  );
}
