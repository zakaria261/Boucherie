import { requireAdminPage } from "@/lib/server/security";
import { BackupScreen } from "@/components/admin/more";

export const metadata = { title: "Sauvegarde" };

export default async function Page() {
  await requireAdminPage();
  return <BackupScreen />;
}
