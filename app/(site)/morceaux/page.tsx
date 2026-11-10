import type { Metadata } from "next";
import { CutMap } from "@/components/site/cut-map";

export const metadata: Metadata = {
  title: "Les morceaux du bœuf, du veau et de l’agneau",
  description:
    "Où se trouve chaque morceau et comment le cuisiner : la carte des découpes de votre artisan boucher à Amiens.",
  alternates: { canonical: "/morceaux" },
};

export default function Morceaux() {
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Recettes et conseils</span>
        <h1>Les morceaux</h1>
        <p>
          Touchez une zone pour savoir d’où vient le morceau, ce qui le
          caractérise et comment le cuisiner.
        </p>
      </header>
      <CutMap />
    </div>
  );
}
