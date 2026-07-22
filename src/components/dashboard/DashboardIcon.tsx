import type { DashboardSection } from "@/config/dashboard";

type DashboardIconProps = {
  section: DashboardSection;
  className?: string;
};

/**
 * Line-style glyphs for each dashboard section. Stroke uses `currentColor`, so
 * colour is driven entirely by the parent's text colour (active/idle states).
 */
export function DashboardIcon({
  section,
  className = "h-[18px] w-[18px]",
}: DashboardIconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (section) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "bots":
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="11" rx="2.5" />
          <path d="M12 8V4.5M9 4h6" />
          <circle cx="9" cy="13" r="1.1" />
          <circle cx="15" cy="13" r="1.1" />
          <path d="M2.5 12v3M21.5 12v3" />
        </svg>
      );
    case "staking":
      return (
        <svg {...common}>
          <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
          <path d="M3 12l9 4.5L21 12" />
          <path d="M3 16.5 12 21l9-4.5" />
        </svg>
      );
    case "referrals":
      return (
        <svg {...common}>
          <circle cx="8" cy="9" r="3" />
          <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
          <circle cx="17.5" cy="7.5" r="2.5" />
          <path d="M15 13.2A5 5 0 0 1 21.5 18" />
        </svg>
      );
    default:
      return null;
  }
}
