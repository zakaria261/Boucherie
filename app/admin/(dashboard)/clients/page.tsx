import { requireAdminPage } from "@/lib/server/security";
import { getCompanies } from "@/lib/server/db";
import { ClientsScreen } from "@/components/admin/clients";

export const metadata = { title: "Clients professionnels" };

export default async function ClientsPage() {
  await requireAdminPage();
  return <ClientsScreen companies={await getCompanies()} />;
}
