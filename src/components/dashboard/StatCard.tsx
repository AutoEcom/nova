"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type StatTone = "cyan" | "purple" | "green" | "magenta" | "neutral";

const valueTone: Record<StatTone, string> = {
  cyan: "text-cyan",
  purple: "text-purple",
  green: "text-green",
  magenta: "text-magenta",
  neutral: "text-foreground",
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  delay?: number;
  className?: string;
};

/** Compact glassmorphism KPI tile used across the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  delay = 0,
  className = "",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
        {icon && <span className={valueTone[tone]}>{icon}</span>}
      </div>
      <p
        className={`mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl ${valueTone[tone]}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[11px] text-muted">{hint}</p>
      )}
    </motion.div>
  );
}
