import Link from "next/link";
import { ArrowUpRight, Clock3, Mail, MapPin, Phone, Store } from "lucide-react";
import { getSettings } from "@/lib/server/db";
export const metadata = {
  title: "Contact & accès à Amiens | Boucherie du Faubourg",
};
export default function Contact() {
  const s = getSettings();
  return (
    <>
      <div className="page-intro section">
        <div className="breadcrumb">
          <Link href="/">Accueil</Link>
          <span>/</span>Contact & accès
        </div>
        <div className="eyebrow">LE PLAISIR DE VOUS RETROUVER</div>
        <h1>
          À bientôt
          <br />
          <em>au comptoir.</em>
        </h1>
        <p>
          Une question, une envie particulière ou un repas à préparer ?
          Parlons-en.
        </p>
      </div>
      <section className="contact-page section">
        <div className="contact-details">
          <div>
            <MapPin />
            <span>
              <small>NOTRE ADRESSE</small>
              <h2>{s.name}</h2>
              <p>{s.address}</p>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}
              >
                Calculer mon itinéraire <ArrowUpRight size={16} />
              </a>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <small>HORAIRES & RETRAIT</small>
              <p className="preserve-lines">{s.hours}</p>
            </span>
          </div>
          <div>
            <Mail />
            <span>
              <small>ÉCRIVEZ-NOUS</small>
              <a href={`mailto:${s.email}`}>{s.email}</a>
            </span>
          </div>
          {s.phone && (
            <div>
              <Phone />
              <span>
                <small>APPELEZ-NOUS</small>
                <a href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}>{s.phone}</a>
              </span>
            </div>
          )}
        </div>
        <div className="contact-illustration">
          <div className="street street-one" />
          <div className="street street-two" />
          <div className="street street-three" />
          <span className="map-street-name">RUE D’ABBEVILLE</span>
          <div className="map-pin">
            <img src={s.logo} alt={s.name} />
            <span>
              <MapPin size={17} /> Votre artisan est ici
            </span>
          </div>
          <span className="map-city">AMIENS</span>
          <a
            className="button primary"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir dans Google Maps <ArrowUpRight size={17} />
          </a>
          <small>
            Illustration de quartier · voir l’itinéraire pour l’accès exact
          </small>
        </div>
      </section>
      <section className="contact-faq section">
        <div>
          <div className="eyebrow">ON VOUS RÉPOND</div>
          <h2>Avant votre visite.</h2>
        </div>
        <div>
          <details open>
            <summary>Comment commander en ligne ?</summary>
            <p>
              Choisissez vos morceaux dans la boutique puis cliquez sur «
              Commander sur WhatsApp ». Votre panier complet s’ouvre dans
              WhatsApp, prêt à être envoyé à la boucherie. Nous confirmons la
              disponibilité et le créneau directement dans la conversation.
            </p>
          </details>
          <details>
            <summary>Puis-je demander une découpe particulière ?</summary>
            <p>
              Bien sûr. Ajoutez vos précisions à votre commande ou
              contactez-nous pour convenir de la préparation adaptée à votre
              recette.
            </p>
          </details>
          <details>
            <summary>
              Comment connaître les ingrédients et les allergènes ?
            </summary>
            <p>
              Consultez les informations de chaque produit et contactez
              directement votre boucher pour toute allergie ou précision avant
              de commander.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
