import { requireAdminPage } from "@/lib/server/security";
import { getProducts } from "@/lib/server/db";
import { subscriptionCount } from "@/lib/server/push";
import { launchChecklist } from "@/lib/server/launch";
import { Today } from "@/components/admin/today";

export const metadata = { title: "Aujourd’hui" };

export default async function TodayPage() {
  await requireAdminPage();
  const lowStock = getProducts(true).filter(
    (p) =>
      p.published &&
      p.stock !== null &&
      (p.stock === 0 || p.stock <= (p.unit === "kg" ? 1000 : p.unit === "100g" ? 300 : 2)),
  );
  const checklist = launchChecklist()
    .filter((c) => !c.done && c.href && c.label.startsWith("Horaires"))
    .map(({ href }) => ({ label: "Vérifier les horaires d’ouverture", href: href! }));
  return <Today lowStock={lowStock} checklist={checklist} pushReady={subscriptionCount() > 0} />;
}
