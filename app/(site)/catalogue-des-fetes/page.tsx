import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getFestive } from "@/lib/server/fetes";
import { FestiveCatalogView } from "@/components/site/festive";
import { Flipbook } from "@/components/site/flipbook";
import { festiveBooklet } from "@/lib/booklets";

export const metadata: Metadata = {
  title: "Catalogue des fêtes",
  description:
    "Foies gras halal, volailles fermières, pièces de bœuf d’exception, rôtis farcis et plateaux à partager : le catalogue de fin d’année de la Boucherie du Faubourg à Amiens.",
  alternates: { canonical: "/catalogue-des-fetes" },
};

export default async function FestivePage() {
  const catalog = await getFestive();
  const sections = catalog.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.visible) }))
    .filter((s) => s.items.length > 0);
  if (!catalog.visible || !sections.length)
    return (
      <div className="page narrow">
        <header className="page-head">
          <span className="eyebrow">Fêtes de fin d’année</span>
          <h1>Catalogue des fêtes</h1>
          <p>Notre catalogue des fêtes revient bientôt. En attendant, toute la boutique reste disponible à la commande.</p>
        </header>
        <Link className="button primary" href="/boutique">
          Voir la boutique
        </Link>
      </div>
    );
  return (
    <div className="page">
      <header className="page-head festive-head">
        <span className="eyebrow">Fêtes de fin d’année</span>
        <h1>Catalogue des fêtes</h1>
        {catalog.intro && <p>{catalog.intro}</p>}
      </header>
      <section className="booklet" aria-labelledby="livret-titre">
        <div className="booklet-head">
          <div>
            <h2 id="livret-titre">Feuilletez le catalogue 2026</h2>
            <p>Toutes nos idées pour les fêtes, page par page. Chaque produit se commande juste en dessous.</p>
          </div>
        </div>
        <Flipbook {...festiveBooklet} />
      </section>
      <h2 className="festive-order-title">Commander les produits du catalogue</h2>
      <p className="lots-hint">
        <CalendarClock size={18} aria-hidden="true" /> Ajoutez les produits à votre liste, précisez quantités et jour de
        retrait : la boucherie vous confirme la disponibilité et le prix. Pour les fêtes, pensez à commander à l’avance.
        Paiement lors du retrait.
      </p>
      <FestiveCatalogView sections={sections} />
    </div>
  );
}
