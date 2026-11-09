import { requireAdminPage } from "@/lib/server/security";
import { AdminProducts } from "@/components/admin-products";
import { getProducts } from "@/lib/server/db";
export default async function Products() {
  await requireAdminPage();
  return <AdminProducts products={getProducts(true)} />;
}
