"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Clock3, Flame, Minus, Plus, ShoppingBag, Users } from "lucide-react";
import type { PublicProduct, Recipe } from "@/lib/types";
import { isWeighed, weightsFor } from "@/lib/shop";
import { useShop } from "./store";
import { ProductCard } from "./product-card";
import { Photo } from "./photo";

/** Quantité recalculée selon le nombre de convives, arrondie de façon lisible. */
export function scaleQuantity(quantity: number, from: number, to: number, unit: string) {
  const value = (quantity * to) / from;
  if (unit === "g") return value >= 100 ? Math.round(value / 50) * 50 : Math.round(value / 10) * 10;
  if (unit === "" || unit === "cl") return Math.max(1, Math.round(value * 2) / 2);
  return Math.round(value * 10) / 10;
}

/** Portions du catalogue les plus proches pour couvrir un poids donné. */
export function portionsFor(product: PublicProduct, grams: number) {
  const weights = weightsFor(product).filter((w) => w > 0);
  if (!weights.length || !isWeighed(product.unit)) return null;
  const best = [...weights].reverse().find((w) => w <= grams) || weights[0];
  return { grams: best, quantity: Math.max(1, Math.round(grams / best)) };
}

export function RecipeView({
  recipe,
  products,
}: {
  recipe: Recipe;
  products: PublicProduct[];
}) {
  const { add, openCart } = useShop();
  const [servings, setServings] = useState(recipe.servings);
  const meat = recipe.ingredients
    .map((i) => ({ i, product: products.find((p) => p.id === i.productId) }))
    .filter((x) => x.product && x.i.quantity && x.i.unit === "g" && x.product.available);

  function addMeat() {
    for (const { i, product } of meat) {
      const grams = scaleQuantity(i.quantity!, recipe.servings, servings, "g");
      const portion = portionsFor(product!, grams);
      if (portion) add(product!, portion.grams, Math.min(20, portion.quantity));
    }
    openCart();
  }

  return (
    <article className="page narrow article recipe">
      <Link className="back-link" href="/recettes">
        <ChevronLeft size={16} /> Recettes
      </Link>
      <h1>{recipe.title}</h1>
      {recipe.intro && <p className="lead">{recipe.intro}</p>}
      <ul className="recipe-meta">
        <li>
          <Clock3 size={17} /> Préparation {recipe.prepMinutes} min
        </li>
        <li>
          <Flame size={17} /> Cuisson {recipe.cookMinutes} min
        </li>
      </ul>
      <Photo className="article-image" src={recipe.image} sizes="(max-width: 860px) 100vw, 860px" preload />
      <div className="recipe-layout">
        <section className="card">
          <div className="servings">
            <h2>Ingrédients</h2>
            <div className="stepper">
              <button
                type="button"
                aria-label="Moins de convives"
                disabled={servings <= 1}
                onClick={() => setServings((s) => Math.max(1, s - 1))}
              >
                <Minus size={16} />
              </button>
              <span aria-live="polite">
                <Users size={15} aria-hidden="true" /> {servings} pers.
              </span>
              <button
                type="button"
                aria-label="Plus de convives"
                disabled={servings >= 30}
                onClick={() => setServings((s) => Math.min(30, s + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <ul className="ingredients">
            {recipe.ingredients.map((i, n) => (
              <li key={n}>
                <span>
                  {i.productId && products.some((p) => p.id === i.productId) ? (
                    <Link href={`/boutique/${encodeURIComponent(i.productId)}`}>{i.name}</Link>
                  ) : (
                    i.name
                  )}
                </span>
                <strong>
                  {i.quantity === null
                    ? "selon le goût"
                    : `${scaleQuantity(i.quantity, recipe.servings, servings, i.unit).toLocaleString("fr-FR")} ${i.unit}`.trim()}
                </strong>
              </li>
            ))}
          </ul>
          {meat.length > 0 && (
            <button className="button primary full" onClick={addMeat}>
              <ShoppingBag size={18} /> Ajouter la viande au panier
            </button>
          )}
        </section>
        <section>
          <h2>Préparation</h2>
          <ol className="recipe-steps">
            {recipe.steps.map((s, n) => (
              <li key={n}>{s}</li>
            ))}
          </ol>
          {recipe.tip && (
            <p className="tip">
              <strong>Le conseil du boucher.</strong> {recipe.tip}
            </p>
          )}
        </section>
      </div>
      {products.length > 0 && (
        <section className="block">
          <h2>Les morceaux pour cette recette</h2>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
