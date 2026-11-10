import { requireAdminPage } from "@/lib/server/security";
import { getSettings } from "@/lib/server/db";
import { PickupSettingsScreen } from "@/components/admin/settings";

export const metadata = { title: "Horaires et retraits" };

export default async function PickupPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return <PickupSettingsScreen initial={settings} />;
}
