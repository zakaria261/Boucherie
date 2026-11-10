import type { Metadata } from "next";
import { Catalog } from "@/components/site/catalog";

export const metadata: Metadata = {
  title: "Barbecue",
  description:
    "Brochettes, merguez maison, saucisses et marinades préparées par votre artisan boucher à Amiens.",
  alternates: { canonical: "/barbecue" },
};

export default async function Barbecue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="page">
      <header className="page-head with-image">
        <div>
          <span className="eyebrow">La sélection barbecue</span>
          <h1>Barbecue</h1>
          <p>
            Brochettes, merguez maison, saucisses et marinades préparées au
            comptoir. Dites-nous combien vous êtes, on vous conseille les
            quantités.
          </p>
        </div>
        <img src="/images/brochette-filet-de-rumsteck.jpg" alt="Brochettes de rumsteck" />
      </header>
      <Catalog barbecue base="/barbecue" category={params.categorie} query={params.q} />
    </div>
  );
}
