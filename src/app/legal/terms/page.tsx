import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | EVOLGO",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal & Compliance" title="Terms of Service">
      <p>
        By accessing Evolgo and interacting with $NOVA, you agree to operate
        within applicable laws and acknowledge that protocol interfaces may
        change as the network evolves.
      </p>
      <p>
        Evolgo provides software interfaces for autonomous trading intelligence
        and protocol participation. You are solely responsible for wallet
        custody, transaction signing, and tax obligations in your jurisdiction.
      </p>
      <p>
        These terms are a living draft for product clarity and will be updated as
        the protocol and legal framework mature.
      </p>
    </LegalPage>
  );
}
