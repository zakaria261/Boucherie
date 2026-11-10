import { requireAdminPage } from "@/lib/server/security";
import { NotificationsScreen } from "@/components/admin/more";

export const metadata = { title: "Notifications" };

export default async function Page() {
  await requireAdminPage();
  return <NotificationsScreen />;
}
