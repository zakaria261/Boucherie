import type { Metadata } from "next";
import { Catalog } from "@/components/site/catalog";

export const metadata: Metadata = {
  title: "La boutique",
  description:
    "Bœuf, veau, agneau, volailles et préparations maison : commandez en ligne chez votre artisan boucher d’Amiens et retirez en boutique.",
  alternates: { canonical: "/boutique" },
};

export default async function Boutique({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Commande en ligne · retrait en boutique</span>
        <h1>La boutique</h1>
        <p>Choisissez vos morceaux et la quantité : nous préparons tout pour votre passage.</p>
      </header>
      <Catalog
        category={params.categorie}
        query={params.q}
        focus={params.recherche === "1"}
      />
    </div>
  );
}
