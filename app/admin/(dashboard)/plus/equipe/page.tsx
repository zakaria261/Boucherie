import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { TeamScreen } from "@/components/admin/team-loyalty";

export const metadata = { title: "Équipe" };

export default async function TeamPage() {
  const admin = await requireAdminPage();
  if (admin.role !== "owner") redirect("/admin/plus");
  return <TeamScreen selfId={admin.id} />;
}
