import type { Metadata } from "next";
import { BotsManagement } from "@/components/dashboard/BotsManagement";

export const metadata: Metadata = {
  title: "AI Bots | EVOLGO Dashboard",
  description:
    "Manage local and cloud EVOLGO AI trading bots powered by $NOVA on MultiversX. Activation shipping with the Intelligence Core.",
};

export default function DashboardBotsPage() {
  return <BotsManagement />;
}
