import { requireAdminPage } from "@/lib/server/security";
import { HelpScreen } from "@/components/admin/more";

export const metadata = { title: "Installer sur l’iPhone" };

export default async function Page() {
  await requireAdminPage();
  return <HelpScreen />;
}
