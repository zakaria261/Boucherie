import { requireAdminPage } from "@/lib/server/security";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/server/db";
import { ProductEditor } from "@/components/product-editor";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const p = getProduct(decodeURIComponent((await params).id));
  if (!p) notFound();
  return <ProductEditor initial={p} key={p.id} />;
}
