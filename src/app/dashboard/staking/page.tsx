import type { Metadata } from "next";
import { StakingProgram } from "@/components/dashboard/StakingProgram";

export const metadata: Metadata = {
  title: "Staking | EVOLGO — Powered by $NOVA",
  description:
    "Stake $NOVA across Flexible, Operator, and Syndicate pools. Lock capital, earn protocol yield, and unlock network authority on MultiversX.",
};

export default function DashboardStakingPage() {
  return <StakingProgram />;
}
