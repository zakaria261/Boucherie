import { requireAdminPage } from "@/lib/server/security";
import { AccountScreen } from "@/components/admin/more";

export const metadata = { title: "Sécurité" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return <AccountScreen email={admin.email} />;
}
