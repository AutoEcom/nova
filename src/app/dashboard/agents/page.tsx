import type { Metadata } from "next";
import { AgentsMarketplace } from "@/components/agents/AgentsMarketplace";

export const metadata: Metadata = {
  title: "Agents | EVOLGO — Powered by $NOVA",
  description:
    "Autonomous Trading Intelligence — deploy institutional-grade Evolgo agents with live execution telemetry and performance streams.",
};

export default function DashboardAgentsPage() {
  return <AgentsMarketplace />;
}
