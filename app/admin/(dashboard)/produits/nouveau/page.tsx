import { requireAdminPage } from "@/lib/server/security";
import { ProductEditor } from "@/components/product-editor";
export default async function NewProduct() {
  await requireAdminPage();
  return <ProductEditor />;
}
