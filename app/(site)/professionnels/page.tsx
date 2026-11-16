import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, PackageCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Espace professionnels",
  description:
    "Restaurateurs, traiteurs, commerces, associations : transmettez vos besoins à la Boucherie du Faubourg à Amiens. Demande de devis ou de commande, sans compte.",
  alternates: { canonical: "/professionnels" },
};

export default function Professionnels() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Espace professionnels</span>
        <h1>Vos commandes professionnelles, préparées avec soin.</h1>
        <p>
          Restaurateur, traiteur, commerçant ou organisateur d’événements ? Transmettez-nous vos besoins, vos quantités
          et vos préférences de préparation. Notre équipe étudiera votre demande pour vous confirmer les disponibilités,
          les tarifs et les modalités de retrait.
        </p>
      </header>
      <div className="pro-actions">
        <Link className="pro-action" href="/professionnels/demande?type=devis">
          <FileText size={26} aria-hidden="true" />
          <span>
            <strong>Demander un devis</strong>
            <small>Articles, quantités, découpes : la boucherie établit un devis avant toute préparation.</small>
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <Link className="pro-action" href="/professionnels/demande?type=commande">
          <PackageCheck size={26} aria-hidden="true" />
          <span>
            <strong>Demander une commande</strong>
            <small>Pour un retrait à une date précise. La commande est préparée après validation par la boucherie.</small>
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </div>
      <section className="card pro-facts">
        <h2>Comment ça se passe</h2>
        <ol>
          <li>Vous transmettez votre demande, sans créer de compte.</li>
          <li>La boucherie l’étudie et vous recontacte pour confirmer disponibilités, tarifs et retrait.</li>
          <li>Vous retirez votre commande en boutique au créneau convenu.</li>
        </ol>
        <p className="fine">
          Le retrait se fait en boutique. Aucun paiement n’est demandé en ligne.
        </p>
      </section>
    </div>
  );
}
