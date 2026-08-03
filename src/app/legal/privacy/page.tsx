import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | EVOLGO",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal & Compliance" title="Privacy Policy">
      <p>
        Evolgo is designed around wallet-native identity. We minimize collection
        of personal data and rely on on-chain activity and local browser storage
        (such as referral attribution) to operate core product features.
      </p>
      <p>
        Third-party providers (wallet connectors, analytics, hosting) may process
        technical data according to their own policies. Avoid submitting sensitive
        personal information through public interfaces.
      </p>
      <p>
        This policy will expand with formal data-processing details as enterprise
        and compliance surfaces come online.
      </p>
    </LegalPage>
  );
}
