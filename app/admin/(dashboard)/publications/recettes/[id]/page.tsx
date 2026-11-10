import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getProducts, getRecipe } from "@/lib/server/db";
import { RecipeEditor } from "@/components/admin/recipe-editor";

export const metadata = { title: "Recette" };

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const products = await getProducts(true);
  if (id === "nouvelle") return <RecipeEditor products={products} />;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <RecipeEditor key={recipe.id} initial={recipe} products={products} />;
}
