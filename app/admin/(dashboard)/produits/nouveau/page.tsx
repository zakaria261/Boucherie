import { requireAdminPage } from "@/lib/server/security";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requireAdminPage();
  return <ProductEditor />;
}
