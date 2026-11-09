import Link from "next/link";
import { Catalog } from "@/components/catalog";
import { getProducts } from "@/lib/server/db";
export const metadata = {
  title: "La sélection barbecue | Boucherie du Faubourg",
};
export default async function Barbecue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="bbq-page-hero">
        <div>
          <div className="breadcrumb">
            <Link href="/">Accueil</Link>
            <span>/</span>Barbecue
          </div>
          <div className="eyebrow">
            ALLUMEZ LES BRAISES. INVITEZ LES COPAINS.
          </div>
          <h1>
            Le goût des
            <br />
            <em>bons moments.</em>
          </h1>
          <p>
            Brochettes, merguez et marinades préparées par nos bouchers.
            <br />
            Tout pour un barbecue dont on se souvient.
          </p>
        </div>
        <img
          src={
            getProducts().find((p) => p.id === "brochette-filet-de-rumsteck")
              ?.image || "/images/hero.jpg"
          }
          alt="Brochettes artisanales pour le barbecue"
        />
      </div>
      <Catalog barbecue category={params.categorie} query={params.q} />
    </>
  );
}
