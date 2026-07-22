"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, type DashboardNavItem } from "@/config/dashboard";
import { DashboardIcon } from "@/components/dashboard/DashboardIcon";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type DashboardNavProps = {
  /** Vertical list for the desktop sidebar; horizontal chips for mobile. */
  orientation?: "vertical" | "horizontal";
  onNavigate?: () => void;
  className?: string;
};

function isActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Shared dashboard section navigation. Orientation adapts the same items for
 * the desktop sidebar (vertical) and the mobile section strip (horizontal).
 */
export function DashboardNav({
  orientation = "vertical",
  onNavigate,
  className = "",
}: DashboardNavProps) {
  const pathname = usePathname() ?? "";

  if (orientation === "horizontal") {
    return (
      <nav
        aria-label="Dashboard sections"
        className={`dash-mobilenav gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {DASHBOARD_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors touch-manipulation ${
                active
                  ? "border-cyan/40 bg-cyan/15 text-cyan"
                  : "border-white/10 bg-white/5 text-muted hover:border-cyan/30 hover:text-cyan"
              }`}
            >
              <DashboardIcon section={item.id} className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Dashboard sections" className={`space-y-1.5 ${className}`}>
      {DASHBOARD_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-start gap-3 rounded-xl border px-3 py-3 transition-all touch-manipulation ${
              active
                ? "border-cyan/35 bg-cyan/10 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]"
            }`}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                active
                  ? "border-cyan/40 bg-cyan/15 text-cyan"
                  : "border-white/10 bg-white/5 text-muted group-hover:text-cyan"
              }`}
            >
              <DashboardIcon section={item.id} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`font-display text-sm font-semibold tracking-wide ${
                    active ? "text-cyan" : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {item.status !== "live" && (
                  <StatusBadge
                    status={item.status}
                    withDot={false}
                    className="!px-2 !py-0.5 !text-[9px]"
                  />
                )}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
