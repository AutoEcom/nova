import type { Metadata } from "next";
import { ReferralsProgram } from "@/components/dashboard/ReferralsProgram";

export const metadata: Metadata = {
  title: "Referrals | EVOLGO — Powered by $NOVA",
  description:
    "Command the network. Share your EVOLGO invite code and earn a permanent cut of protocol activity in $NOVA.",
};

export default function DashboardReferralsPage() {
  return <ReferralsProgram />;
}
