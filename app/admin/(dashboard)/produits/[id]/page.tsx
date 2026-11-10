import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getProduct } from "@/lib/server/db";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Produit" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const product = getProduct(decodeURIComponent((await params).id));
  if (!product) notFound();
  return <ProductEditor key={product.id} initial={product} />;
}
