import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Documentation | EVOLGO",
  description: "EVOLGO protocol documentation and operator guides.",
};

export default function DocsPage() {
  return (
    <LegalPage eyebrow="Resources" title="Documentation">
      <p>
        Protocol documentation is being assembled for operators, integrators, and
        developers. Core surfaces — staking, referrals, agents, and $NOVA
        economics — are already live in the Evolgo console.
      </p>
      <p>
        For on-chain verification, use the MultiversX Explorer links in the site
        footer. Full technical docs will publish here as the intelligence layer
        expands.
      </p>
    </LegalPage>
  );
}
