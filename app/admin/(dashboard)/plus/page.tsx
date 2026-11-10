import { requireAdminPage } from "@/lib/server/security";
import { launchChecklist } from "@/lib/server/launch";
import { MoreScreen } from "@/components/admin/more";

export const metadata = { title: "Plus" };

export default async function MorePage() {
  const admin = await requireAdminPage();
  return (
    <MoreScreen
      email={admin.email}
      todo={(await launchChecklist()).filter((c) => !c.done).length}
    />
  );
}
