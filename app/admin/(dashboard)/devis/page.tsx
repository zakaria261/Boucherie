import { requireAdminPage } from "@/lib/server/security";
import { getQuotes } from "@/lib/server/db";
import { QuotesScreen } from "@/components/admin/quotes";

export const metadata = { title: "Devis" };

export default async function QuotesPage() {
  await requireAdminPage();
  return <QuotesScreen quotes={await getQuotes()} />;
}
