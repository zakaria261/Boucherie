import { getSettings } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/security";
import { SettingsEditor } from "@/components/settings-editor";
export default async function Settings() {
  await requireAdminPage();
  return <SettingsEditor initial={getSettings()} />;
}
