import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { EVOLGO_EXCHANGE_WHITELIST_IP } from "@/config/exchanges";

export const metadata: Metadata = {
  title: "Exchange API Setup Guide | EVOLGO",
  description:
    "Recommended Binance / OKX Futures API key settings for Evolgo agents — IP whitelist, permissions, and withdrawals disabled.",
};

export default function ExchangeSetupDocsPage() {
  return (
    <LegalPage eyebrow="Documentation" title="Exchange API Setup Guide">
      <p>
        This guide will walk operators through creating a futures API key for
        Evolgo agents. Full screenshots and venue-specific steps are coming
        soon — until then, use the checklist below.
      </p>

      <h2 className="!mt-8 font-display text-lg font-semibold tracking-wide text-foreground">
        Recommended settings
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Whitelist <strong className="text-foreground">only</strong> the Evolgo
          IP:{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-cyan">
            {EVOLGO_EXCHANGE_WHITELIST_IP}
          </code>
        </li>
        <li>
          Enable <strong className="text-foreground">Reading</strong> and{" "}
          <strong className="text-foreground">Futures</strong> permissions
        </li>
        <li>
          <strong className="text-loss">Disable Withdrawals</strong> — required
          for security
        </li>
      </ul>

      <p className="!mt-6">
        Detailed Binance and OKX walkthroughs will publish here next. For now,
        configure keys in the Agents terminal under{" "}
        <span className="text-foreground">Exchange / API</span>.
      </p>

      <p>
        <Link
          href="/dashboard/agents"
          className="font-mono text-[12px] text-cyan hover:text-foreground"
        >
          ← Back to Agents
        </Link>
      </p>
    </LegalPage>
  );
}
