import { requireAdminPage } from "@/lib/server/security";
import {
  getPosts,
  getProducts,
  getPromotions,
  getRecipes,
  promotionState,
} from "@/lib/server/db";
import { PublicationsScreen } from "@/components/admin/publications";

export const metadata = { title: "Publications" };

export default async function PublicationsPage() {
  await requireAdminPage();
  const products = await getProducts(true);
  const promotions = (await getPromotions()).map((p) => {
    const product = products.find((x) => x.id === p.productId);
    return {
      ...p,
      state: promotionState(p),
      productName: product?.name || "Produit supprimé",
      unit: product?.unit || "kg",
    };
  });
  return (
    <PublicationsScreen
      promotions={promotions}
      posts={await getPosts()}
      recipes={await getRecipes(true)}
      products={products}
    />
  );
}
