import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { getSettings } from "@/lib/server/db";
import { OpeningHours } from "@/components/site/hours";
import { directionsUrl, telHref } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact et accès",
  description:
    "Adresse, horaires et téléphone de la Boucherie du Faubourg, 6 rue d’Abbeville à Amiens.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  const s = getSettings();
  const whatsapp = whatsappLink(
    s.whatsapp,
    "Bonjour, j’ai une question pour la Boucherie du Faubourg.",
  );
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Nous trouver</span>
        <h1>Contact et accès</h1>
      </header>
      <div className="contact-grid">
        <section className="card contact-card">
          <h2>{s.name}</h2>
          <ul className="contact-list">
            <li>
              <MapPin size={19} />
              <span>{s.address}</span>
            </li>
            {s.phone && (
              <li>
                <Phone size={19} />
                <a href={telHref(s.phone)}>{s.phone}</a>
              </li>
            )}
            <li>
              <Mail size={19} />
              <a href={`mailto:${s.email}`}>{s.email}</a>
            </li>
            {whatsapp && (
              <li>
                <MessageCircle size={19} />
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  Écrire sur WhatsApp
                </a>
              </li>
            )}
          </ul>
          <a
            className="button primary full"
            href={directionsUrl(s.address)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={18} /> Itinéraire
          </a>
        </section>
        <OpeningHours pickup={s.pickup} note={s.hours} />
      </div>
      <section className="block faq">
        <h2>Questions fréquentes</h2>
        <details>
          <summary>Comment commander en ligne ?</summary>
          <p>
            Ajoutez vos produits au panier, choisissez votre jour et votre heure
            de passage, puis confirmez. Votre commande arrive directement chez
            votre boucher, et vous suivez sa préparation depuis le lien reçu.
          </p>
        </details>
        <details>
          <summary>Quand dois-je payer ?</summary>
          <p>
            Au retrait, en boutique. Le prix affiché en ligne est une estimation :
            le montant final dépend du poids réellement préparé.
          </p>
        </details>
        <details>
          <summary>Puis-je demander une découpe particulière ?</summary>
          <p>
            Oui. Choisissez les options proposées sur la fiche produit ou
            écrivez votre demande dans le champ « Une précision ? » au moment de
            commander.
          </p>
        </details>
        <details>
          <summary>Où trouver les allergènes et l’origine des viandes ?</summary>
          <p>
            Ils figurent sur la fiche produit lorsqu’ils sont renseignés.
            Sinon, demandez-nous : nous vous répondons au comptoir ou par
            téléphone.
          </p>
        </details>
      </section>
    </div>
  );
}
