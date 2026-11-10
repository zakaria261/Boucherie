import { requireAdminPage } from "@/lib/server/security";
import { launchChecklist } from "@/lib/server/launch";
import { LaunchChecklist } from "@/components/admin/more";

export const metadata = { title: "Avant la mise en ligne" };

export default async function ChecklistPage() {
  await requireAdminPage();
  return <LaunchChecklist items={await launchChecklist()} />;
}
