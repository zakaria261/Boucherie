import type { Metadata } from "next";
import { getOffers } from "@/lib/server/offers";
import { plateaux } from "@/lib/plateaux";
import { PlateauxView } from "@/components/site/plateaux";

export const metadata: Metadata = {
  title: "Plateaux à partager",
  description:
    "Fondue bourguignonne, pierrade et plancha nature ou marinée, plateau charcuterie : commandez la veille à la Boucherie du Faubourg à Amiens, pour le nombre de personnes ou le budget de votre choix.",
  alternates: { canonical: "/plateaux-a-partager" },
};

export default async function PlateauxPage() {
  const { marinades } = await getOffers();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Plateaux à partager</span>
        <h1>Fondue, pierrade, charcuterie</h1>
        <p>
          Des plateaux préparés pour vos repas en famille ou entre amis. Dites-nous pour combien de personnes, ou
          votre budget : nous composons le plateau pour vous.
        </p>
      </header>
      <PlateauxView plateaux={plateaux} marinades={marinades.filter((m) => m.visible)} />
    </div>
  );
}
