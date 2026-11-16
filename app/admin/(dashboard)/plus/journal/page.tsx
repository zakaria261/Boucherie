import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { JournalScreen } from "@/components/admin/team-loyalty";

export const metadata = { title: "Journal" };

export default async function JournalPage() {
  const admin = await requireAdminPage();
  if (admin.role !== "owner") redirect("/admin/plus");
  return <JournalScreen />;
}
