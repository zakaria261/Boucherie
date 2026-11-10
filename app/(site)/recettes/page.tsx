import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRecipes } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Recettes et conseils",
  description:
    "Recettes de bœuf, veau, agneau et volaille proposées par votre artisan boucher, avec les morceaux à commander.",
  alternates: { canonical: "/recettes" },
};

export default async function Recettes() {
  const recipes = await getRecipes();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Recettes et conseils</span>
        <h1>Bien cuisiner sa viande</h1>
        <p>
          Des recettes simples, avec les bons morceaux et les bonnes quantités.
          Ajustez le nombre de convives, nous calculons le reste.
        </p>
      </header>
      <div className="recipe-grid">
        {recipes.map((r) => (
          <Link className="recipe-card" key={r.id} href={`/recettes/${r.id}`}>
            {r.image && <img src={r.image} alt="" loading="lazy" />}
            <span>
              <strong>{r.title}</strong>
              <small>
                {r.servings} pers. · {r.prepMinutes + r.cookMinutes} min
              </small>
            </span>
          </Link>
        ))}
      </div>
      <div className="tool-links">
        <Link href="/morceaux">
          <strong>Les morceaux</strong>
          <span>
            Bœuf, veau, agneau : où se trouve chaque morceau et comment le
            cuisiner.
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link href="/que-cuisiner">
          <strong>Que cuisiner ?</strong>
          <span>
            Une idée selon le repas, le nombre de convives et le budget.
          </span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
