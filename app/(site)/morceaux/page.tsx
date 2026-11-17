import type { Metadata } from "next";
import { CutExplorer } from "@/components/site/cut-map";
import { getCutGuide } from "@/lib/server/cut-guide";

export const metadata: Metadata = {
  title: "À chaque morceau, son plaisir · Bœuf, agneau, veau",
  description:
    "Les morceaux du bœuf, de l’agneau et du veau : où ils se trouvent, leurs particularités, les cuissons conseillées et les astuces de votre artisan boucher à Amiens.",
  alternates: { canonical: "/morceaux" },
};

export default async function Morceaux() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Guide des morceaux</span>
        <h1>À chaque morceau, son plaisir</h1>
        <p>
          Découvrez les morceaux de bœuf, d’agneau et de veau, leurs particularités et les conseils de votre boucher pour
          les cuisiner. Sélectionnez un animal, puis un morceau pour trouver l’inspiration.
        </p>
      </header>
      <CutExplorer guide={await getCutGuide()} />
    </div>
  );
}
