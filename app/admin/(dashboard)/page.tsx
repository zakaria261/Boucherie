import { requireAdminPage } from "@/lib/server/security";
import { getProducts, getQuotes, getSettings } from "@/lib/server/db";
import { quoteStatus } from "@/lib/server/quotes";
import { subscriptionCount } from "@/lib/server/push";
import { launchChecklist } from "@/lib/server/launch";
import { Today } from "@/components/admin/today";

export const metadata = { title: "Aujourd’hui" };

export default async function TodayPage() {
  await requireAdminPage();
  const lowStock = (await getProducts(true)).filter(
    (p) =>
      p.published &&
      p.stock !== null &&
      (p.stock === 0 ||
        p.stock <= (p.unit === "kg" ? 1000 : p.unit === "100g" ? 300 : 2)),
  );
  const checklist = (await launchChecklist())
    .filter((c) => !c.done && c.href && c.label.startsWith("Horaires"))
    .map(({ href }) => ({
      label: "Vérifier les horaires d’ouverture",
      href: href!,
    }));
  return (
    <Today
      lowStock={lowStock}
      checklist={checklist}
      pushReady={(await subscriptionCount()) > 0}
      quotesPending={
        (await getQuotes()).filter((q) => ["Demande reçue", "En étude", "Accepté"].includes(quoteStatus(q))).length
      }
      closed={(await getSettings()).pickup.closed}
    />
  );
}
