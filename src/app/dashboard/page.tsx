import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { AiPerformance } from "@/components/dashboard/AiPerformance";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
          Overview
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-wide sm:text-3xl">
          Operator dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Live $NOVA holdings paired with EVOLGO AI backtest intelligence — the
          command surface for MultiversX operators.
        </p>
      </header>

      <PortfolioOverview />
      <AiPerformance />
    </div>
  );
}
