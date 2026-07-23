"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

/**
 * Curated backtest showcase for the Overview. Numbers are representative of
 * the strategy suite currently under validation — they will be wired to live
 * engine telemetry once the AI Trading Dashboard ships.
 */
const BACKTEST_STATS = [
  {
    label: "Win Rate",
    value: "68.4%",
    hint: "Trailing 90-day sample",
    tone: "green" as const,
  },
  {
    label: "Profit Factor",
    value: "1.92",
    hint: "Gross profit / gross loss",
    tone: "cyan" as const,
  },
  {
    label: "Avg. Trade ROI",
    value: "+2.7%",
    hint: "Per closed position",
    tone: "purple" as const,
  },
  {
    label: "Max Drawdown",
    value: "−8.1%",
    hint: "Peak-to-trough",
    tone: "magenta" as const,
  },
] as const;

const STRATEGY_ROWS = [
  {
    name: "Supernova Momentum",
    timeframe: "4H",
    winRate: "71%",
    profitFactor: "2.14",
    status: "live" as const,
  },
  {
    name: "Neon Mean-Reversion",
    timeframe: "1H",
    winRate: "64%",
    profitFactor: "1.71",
    status: "in-progress" as const,
  },
  {
    name: "Void Breakout",
    timeframe: "1D",
    winRate: "59%",
    profitFactor: "1.48",
    status: "coming-soon" as const,
  },
] as const;

export function AiPerformance() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
            AI Trading Performance
          </p>
          <h2 className="mt-2 font-display text-xl font-bold tracking-wide sm:text-2xl">
            Backtest intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Aggregated metrics from the EVOLGO strategy suite currently validating
            on MultiversX market data. Live telemetry unlocks with the AI
            Trading Dashboard.
          </p>
        </div>
        <StatusBadge status="in-progress" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BACKTEST_STATS.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            tone={stat.tone}
            delay={0.05 * i}
          />
        ))}
      </div>

      <GlassCard strong delay={0.15}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-wide">
            Strategy suite
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Sample · Not live P&amp;L
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="pb-3 pr-3 font-medium">Strategy</th>
                <th className="pb-3 pr-3 font-medium">TF</th>
                <th className="pb-3 pr-3 font-medium">Win Rate</th>
                <th className="pb-3 pr-3 font-medium">PF</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGY_ROWS.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-3.5 pr-3 font-display text-sm font-semibold tracking-wide">
                    {row.name}
                  </td>
                  <td className="py-3.5 pr-3 font-mono text-xs text-muted">
                    {row.timeframe}
                  </td>
                  <td className="py-3.5 pr-3 font-mono text-xs text-green">
                    {row.winRate}
                  </td>
                  <td className="py-3.5 pr-3 font-mono text-xs text-cyan">
                    {row.profitFactor}
                  </td>
                  <td className="py-3.5">
                    <StatusBadge
                      status={row.status}
                      className="!px-2 !py-0.5 !text-[9px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-white/8 pt-5">
          <ProgressBar
            label="AI Engine Validation"
            status="In Progress"
            progress={62}
            tone="cyan"
          />
        </div>
      </GlassCard>
    </section>
  );
}
