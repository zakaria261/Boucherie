import { requireAdminPage } from "@/lib/server/security";
import { launchChecklist } from "@/lib/server/launch";
import { getCompanies, getQuotes } from "@/lib/server/db";
import { quoteStatus } from "@/lib/server/quotes";
import { MoreScreen } from "@/components/admin/more";

export const metadata = { title: "Plus" };

export default async function MorePage() {
  const admin = await requireAdminPage();
  return (
    <MoreScreen
      email={admin.email}
      owner={admin.role === "owner"}
      quotes={(await getQuotes()).filter((q) => ["Demande reçue", "En étude"].includes(quoteStatus(q))).length}
      toVerify={(await getCompanies()).filter((c) => c.status === "À vérifier").length}
      todo={(await launchChecklist()).filter((c) => !c.done).length}
    />
  );
}
