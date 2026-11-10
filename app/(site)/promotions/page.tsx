import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublicProducts } from "@/lib/server/db";
import { ProductCard } from "@/components/site/product-card";

export const metadata: Metadata = {
  title: "Promotions",
  description: "Les offres du moment à la Boucherie du Faubourg, à Amiens.",
  alternates: { canonical: "/promotions" },
};

export default async function Promotions() {
  const products = await getPublicProducts();
  const promos = products.filter((p) => p.promo && p.available);
  const featured = products.filter((p) => p.featured && !p.promo).slice(0, 4);
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Offres du moment</span>
        <h1>Promotions</h1>
        <p>
          Les prix barrés sont nos prix habituels. Les offres s’arrêtent
          automatiquement à leur date de fin ou lorsque la quantité prévue est
          écoulée.
        </p>
      </header>
      {promos.length ? (
        <div className="product-grid">
          {promos.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Pas de promotion en ce moment.</h2>
          <p>
            Revenez bientôt : les offres sont publiées au fil des arrivages.
          </p>
          <Link className="button outline" href="/boutique">
            Voir toute la boutique <ArrowRight size={18} />
          </Link>
        </div>
      )}
      {featured.length > 0 && (
        <section className="block">
          <h2>Le choix du boucher</h2>
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
