import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Risk Disclosure | EVOLGO",
};

export default function RiskPage() {
  return (
    <LegalPage eyebrow="Legal & Compliance" title="Risk Disclosure">
      <p>
        Digital assets including $NOVA are volatile. Smart contracts, bridges,
        market makers, and autonomous strategies can fail, be exploited, or
        produce unexpected outcomes. Past performance is not indicative of future
        results.
      </p>
      <p>
        Staking locks, referral rewards, and agent modules may be delayed,
        reduced, or unavailable. Yield figures shown in the interface are
        estimates or mock previews unless explicitly confirmed on-chain.
      </p>
      <p>
        Nothing on Evolgo constitutes financial, legal, or investment advice. Only
        deploy capital you can afford to lose and verify every transaction in
        your wallet before signing.
      </p>
    </LegalPage>
  );
}
