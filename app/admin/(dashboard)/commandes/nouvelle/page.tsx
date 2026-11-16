import { requireAdminPage } from "@/lib/server/security";
import { getProducts } from "@/lib/server/db";
import { ManualOrder } from "@/components/admin/manual-order";

export const metadata = { title: "Nouvelle commande" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage();
  const products = (await getProducts(true)).filter((p) => p.published && p.available);
  return <ManualOrder products={products} startWithPhoto={(await searchParams).photo === "1"} />;
}
