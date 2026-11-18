import type { Metadata } from "next";
import { getOffers } from "@/lib/server/offers";
import { LotsAndMarinades } from "@/components/site/lots";
import { Flipbook } from "@/components/site/flipbook";
import { marinadeBooklet } from "@/lib/booklets";

export const metadata: Metadata = {
  title: "Nos lots et marinades",
  description:
    "Les lots de viande de la Boucherie du Faubourg à Amiens et nos marinades maison : commandez la veille, retirez le lendemain en boutique.",
  alternates: { canonical: "/lots-et-marinades" },
};

export default async function Lots() {
  const offers = await getOffers();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Lots et marinades</span>
        <h1>Nos lots et nos marinades</h1>
        <p>
          Des colis prêts à emporter pour toute la famille, et des viandes disponibles avec nos marinades maison. Pour être
          sûr de les avoir, commandez la veille pour le lendemain : nous préparons tout pour votre passage.
        </p>
      </header>
      <LotsAndMarinades
        lots={offers.lots.filter((l) => l.visible)}
        marinades={offers.marinades.filter((m) => m.visible)}
        booklet={
          <div className="booklet">
            <Flipbook {...marinadeBooklet} />
          </div>
        }
      />
    </div>
  );
}
