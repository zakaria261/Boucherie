import type { Metadata } from "next";
import { Catalog } from "@/components/site/catalog";
import { Photo } from "@/components/site/photo";

export const metadata: Metadata = {
  title: "Barbecue",
  description:
    "Brochettes, merguez maison, saucisses et marinades préparées par votre artisan boucher à Amiens.",
  alternates: { canonical: "/barbecue" },
};

export default function Barbecue() {
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
        <Photo src="/images/brochette-filet-de-rumsteck.jpg" alt="Brochettes de rumsteck" sizes="(max-width: 900px) 100vw, 40vw" preload />
      </header>
      <Catalog barbecue base="/barbecue" />
    </div>
  );
}
