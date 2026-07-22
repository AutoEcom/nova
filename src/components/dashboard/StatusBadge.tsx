import {
  STATUS_LABEL,
  STATUS_TONE,
  type DashboardStatus,
  type StatusTone,
} from "@/config/dashboard";

const toneClass: Record<StatusTone, string> = {
  green: "border-green/30 bg-green/10 text-green",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  purple: "border-purple/30 bg-purple/10 text-purple",
};

const dotClass: Record<StatusTone, string> = {
  green: "bg-green",
  cyan: "bg-cyan",
  purple: "bg-purple",
};

type StatusBadgeProps = {
  status: DashboardStatus;
  className?: string;
  /** Show the pulsing status dot. Defaults to true. */
  withDot?: boolean;
};

/** Neon lifecycle pill: Live / In Progress / Coming Soon. */
export function StatusBadge({
  status,
  className = "",
  withDot = true,
}: StatusBadgeProps) {
  const tone = STATUS_TONE[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${toneClass[tone]} ${className}`}
    >
      {withDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]} animate-pulse-glow`}
          aria-hidden
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
