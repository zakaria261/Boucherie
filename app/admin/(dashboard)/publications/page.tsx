import { requireAdminPage } from "@/lib/server/security";
import { getPosts, getProducts, getPromotions, getRecipes, promotionState } from "@/lib/server/db";
import { PublicationsScreen } from "@/components/admin/publications";

export const metadata = { title: "Publications" };

export default async function PublicationsPage() {
  await requireAdminPage();
  const products = getProducts(true);
  const promotions = getPromotions().map((p) => {
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
      posts={getPosts()}
      recipes={getRecipes(true)}
      products={products}
    />
  );
}
