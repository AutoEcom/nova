import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { EVOLGO_EXCHANGE_WHITELIST_IP } from "@/config/exchanges";

export const metadata: Metadata = {
  title: "Exchange API Setup Guide | EVOLGO",
  description:
    "Binance Single-Asset and OKX passphrase setup for Evolgo Futures agents — IP whitelist, permissions, withdrawals disabled.",
};

export default function ExchangeSetupDocsPage() {
  return (
    <LegalPage eyebrow="Documentation" title="Exchange API Setup Guide">
      <p>
        Configure a futures API key before arming Live mode in an Evolgo agent
        terminal. Withdrawals must stay disabled. Whitelist only the Evolgo
        egress IP when the venue supports IP restriction.
      </p>

      <p className="!mt-4 font-mono text-[12px] text-cyan">
        Evolgo IP ·{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5">
          {EVOLGO_EXCHANGE_WHITELIST_IP}
        </code>
      </p>

      <h2 className="!mt-8 font-display text-lg font-semibold tracking-wide text-foreground">
        Binance Futures (USD-M)
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Whitelist <strong className="text-foreground">only</strong> the Evolgo
          IP above
        </li>
        <li>
          Enable <strong className="text-foreground">Reading</strong> and{" "}
          <strong className="text-foreground">Futures</strong>
        </li>
        <li>
          <strong className="text-loss">Disable Withdrawals</strong>
        </li>
        <li>
          Account mode must be{" "}
          <strong className="text-foreground">Single-Asset</strong> — Evolgo
          does not support Multi-Assets Mode
        </li>
        <li>
          If your region only allows Multi-Assets Mode, use{" "}
          <strong className="text-foreground">OKX</strong> instead
        </li>
      </ul>

      <h2 className="!mt-8 font-display text-lg font-semibold tracking-wide text-foreground">
        OKX Futures
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Create an API key with{" "}
          <strong className="text-foreground">Trade</strong> +{" "}
          <strong className="text-foreground">Read</strong>
        </li>
        <li>
          <strong className="text-loss">Disable Withdrawals</strong>
        </li>
        <li>
          Set a <strong className="text-foreground">Passphrase</strong> when
          creating the key — required in Evolgo Exchange / API
        </li>
        <li>
          IP whitelist the Evolgo IP when OKX UI offers it
        </li>
      </ul>

      <h2 className="!mt-8 font-display text-lg font-semibold tracking-wide text-foreground">
        Coming soon
      </h2>
      <p>
        Auto region routing (Binance → OKX fallback) and Bybit Futures connect.
        Until then, operators choose the venue manually in Exchange / API.
      </p>

      <p className="!mt-6">
        Configure keys from the Agents terminal under{" "}
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
