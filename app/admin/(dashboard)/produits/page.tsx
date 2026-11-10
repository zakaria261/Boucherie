import { requireAdminPage } from "@/lib/server/security";
import { getProducts } from "@/lib/server/db";
import { ProductsScreen } from "@/components/admin/products";

export const metadata = { title: "Produits" };

export default async function ProductsPage() {
  await requireAdminPage();
  return <ProductsScreen initial={await getProducts(true)} />;
}
