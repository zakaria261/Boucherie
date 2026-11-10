import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Notre maison",
  description:
    "La Boucherie du Faubourg, artisan boucher au 6 rue d’Abbeville à Amiens depuis 2018.",
  alternates: { canonical: "/notre-maison" },
};

export default async function NotreMaison() {
  const s = await getSettings();
  return (
    <div className="page">
      <header className="page-head with-image">
        <div>
          <span className="eyebrow">Depuis 2018 à Amiens</span>
          <h1>Notre maison</h1>
          {s.story.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="row-actions">
            <Link className="button primary" href="/boutique">
              Voir la boutique <ArrowRight size={18} />
            </Link>
            <Link className="button outline" href="/contact">
              Nous rendre visite
            </Link>
          </div>
        </div>
        <img src={s.storyImage} alt="Au comptoir de la Boucherie du Faubourg" />
      </header>
      <section className="block values">
        <div>
          <h2>Au comptoir</h2>
          <p>
            Nous sélectionnons, découpons et préparons nous-mêmes. Dites-nous ce
            que vous cuisinez : nous vous conseillons le morceau et la quantité.
          </p>
        </div>
        <div>
          <h2>Sur mesure</h2>
          <p>
            Épaisseur, découpe, ficelage, désossage : précisez-le dans votre
            commande ou demandez-le au comptoir.
          </p>
        </div>
        <div>
          <h2>Fait maison</h2>
          <p>
            Merguez, saucisses, brochettes et marinades sont préparées dans
            notre atelier.
          </p>
        </div>
      </section>
    </div>
  );
}
