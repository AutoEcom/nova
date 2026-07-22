import type { Metadata } from "next";
import { BotsManagement } from "@/components/dashboard/BotsManagement";

export const metadata: Metadata = {
  title: "AI Bots | NOVA Dashboard",
  description:
    "Manage local and cloud NOVA AI trading bots on MultiversX. Activation shipping with the Intelligence Core.",
};

export default function DashboardBotsPage() {
  return <BotsManagement />;
}
