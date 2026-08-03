import type { Metadata } from "next";
import { TokenomicsPage } from "@/components/tokenomics/TokenomicsPage";

export const metadata: Metadata = {
  title: "Tokenomics & Protocol Yield | EVOLGO — Powered by $NOVA",
  description:
    "$NOVA protocol economics: 450M hard-cap supply, buyback-backed value accrual, and staking tiers that unlock network authority on MultiversX.",
};

export default function TokenomicsRoutePage() {
  return <TokenomicsPage />;
}
