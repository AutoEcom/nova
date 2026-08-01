import type { Metadata } from "next";
import { BotsManagement } from "@/components/dashboard/BotsManagement";

export const metadata: Metadata = {
  title: "Agents | EVOLGO Dashboard",
  description:
    "Manage local and cloud EVOLGO autonomous agents powered by $NOVA on MultiversX. Activation shipping with the Intelligence Core.",
};

export default function DashboardBotsPage() {
  return <BotsManagement />;
}
