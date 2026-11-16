import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/server/db";
import { LoyaltyBalance } from "@/components/site/loyalty-balance";

export const metadata: Metadata = {
  title: "Fidélité",
  alternates: { canonical: "/fidelite" },
};

/** Page affichée uniquement lorsque le programme est activé et validé. */
export default async function Fidelite() {
  const { loyalty } = await getSettings();
  if (!loyalty.enabled) notFound();
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Programme de fidélité</span>
        <h1>Vos achats récompensés</h1>
        <p>
          {loyalty.pointsPerEuro} point{loyalty.pointsPerEuro > 1 ? "s" : ""} par euro payé en boutique. Dès{" "}
          {loyalty.threshold} points : {loyalty.reward}.
        </p>
      </header>
      <section className="card">
        <h2>Conditions</h2>
        <ul className="plain-list">
          <li>Les points sont comptés sur le montant réellement payé au retrait de vos commandes.</li>
          <li>Une demande ou une commande non retirée ne rapporte pas de points.</li>
          {loyalty.validityMonths > 0 && (
            <li>Les points expirent après {loyalty.validityMonths} mois sans achat.</li>
          )}
          {loyalty.exclusions && <li>{loyalty.exclusions}</li>}
        </ul>
      </section>
      <LoyaltyBalance />
    </div>
  );
}
