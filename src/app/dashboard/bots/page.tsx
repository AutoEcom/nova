import { redirect } from "next/navigation";

/** Legacy path — Agents live at /dashboard/agents. */
export default function DashboardBotsRedirectPage() {
  redirect("/dashboard/agents");
}
