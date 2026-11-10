import { requireAdminPage } from "@/lib/server/security";
import { getProducts } from "@/lib/server/db";
import { StockScreen } from "@/components/admin/stock";

export const metadata = { title: "Quantités du jour" };

export default async function StockPage() {
  await requireAdminPage();
  return <StockScreen initial={await getProducts(true)} />;
}
