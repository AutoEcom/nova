import type { Metadata } from "next";
import { ComingSoonPanel } from "@/components/dashboard/ComingSoonPanel";

export const metadata: Metadata = {
  title: "Referrals | NOVA Dashboard",
  description:
    "Invite operators into NOVA and earn referral rewards. Program launching soon on MultiversX.",
};

export default function DashboardReferralsPage() {
  return (
    <ComingSoonPanel
      eyebrow="Referrals"
      title="Referral program"
      description="Share your invite link, onboard operators, and earn a cut of their protocol activity. Tracking, payouts, and tiered multipliers are under construction."
      status="coming-soon"
      progress={18}
      features={[
        "Personal invite codes",
        "Tiered reward multipliers",
        "Real-time referral ledger",
        "Claimable $NOVA payouts",
        "Fraud-resistant attribution",
        "Campaign leaderboards",
      ]}
    />
  );
}
