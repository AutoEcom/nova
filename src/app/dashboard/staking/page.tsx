import type { Metadata } from "next";
import { StakingProgram } from "@/components/dashboard/StakingProgram";

export const metadata: Metadata = {
  title: "Staking | EVOLGO — Powered by $NOVA",
  description:
    "Power the agent network. Stake $NOVA to maximize liquidity, compound returns, and unlock elite tiers for your autonomous ecosystem.",
};

export default function DashboardStakingPage() {
  return <StakingProgram />;
}
