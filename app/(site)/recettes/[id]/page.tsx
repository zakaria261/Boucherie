import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProducts, getRecipe } from "@/lib/server/db";
import { RecipeView } from "@/components/site/recipe-view";
import { siteUrl } from "@/lib/site";

async function load(id: string) {
  const recipe = await getRecipe(decodeURIComponent(id));
  return recipe?.published ? recipe : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const recipe = await load((await params).id);
  if (!recipe) return { title: "Recette introuvable" };
  return {
    title: `${recipe.title} · Recette`,
    description: recipe.intro.slice(0, 160),
    alternates: { canonical: `/recettes/${recipe.id}` },
    openGraph: recipe.image ? { images: [recipe.image] } : undefined,
  };
}

export default async function Recette({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const recipe = await load((await params).id);
  if (!recipe) notFound();
  const ids = new Set([
    ...recipe.productIds,
    ...recipe.ingredients.map((i) => i.productId).filter(Boolean),
  ]);
  const products = (await getPublicProducts()).filter((p) => ids.has(p.id));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.intro,
    image: recipe.image ? `${siteUrl}${recipe.image}` : undefined,
    recipeYield: `${recipe.servings} personnes`,
    prepTime: `PT${recipe.prepMinutes}M`,
    cookTime: `PT${recipe.cookMinutes}M`,
    recipeIngredient: recipe.ingredients.map((i) =>
      [i.quantity, i.unit, i.name]
        .filter((x) => x !== null && x !== "")
        .join(" "),
    ),
    recipeInstructions: recipe.steps.map((text) => ({
      "@type": "HowToStep",
      text,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecipeView recipe={recipe} products={products} />
    </>
  );
}
