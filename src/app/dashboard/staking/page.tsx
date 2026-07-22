import type { Metadata } from "next";
import { ComingSoonPanel } from "@/components/dashboard/ComingSoonPanel";

export const metadata: Metadata = {
  title: "Staking | NOVA Dashboard",
  description:
    "Stake $NOVA into protocol pools and earn buyback-boosted rewards. Coming soon on MultiversX.",
};

export default function DashboardStakingPage() {
  return (
    <ComingSoonPanel
      eyebrow="Staking"
      title="Staking pools & rewards"
      description="Lock $NOVA into tiered pools that share protocol performance. Flexible and locked tiers with buyback-boosted APY ship with the staking infrastructure release."
      status="coming-soon"
      progress={28}
      features={[
        "Flexible & locked tiers",
        "Buyback-boosted APY",
        "On-chain reward proofs",
        "Auto-compound options",
        "Epoch-aligned unlocks",
        "Pool capacity gauges",
      ]}
    />
  );
}
