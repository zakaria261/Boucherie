import type { Metadata } from "next";
import { faq } from "@/lib/faq";
import { Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { getSettings } from "@/lib/server/db";
import { OpeningHours } from "@/components/site/hours";
import { directionsUrl, telHref } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";
import { SocialLinks } from "@/components/site/social-links";

export const metadata: Metadata = {
  title: "Contact et accès",
  description:
    "Adresse, horaires et téléphone de la Boucherie du Faubourg, 6 rue d’Abbeville à Amiens.",
  alternates: { canonical: "/contact" },
};

export default async function Contact() {
  const s = await getSettings();
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
          <SocialLinks links={s.social} labelled />
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
      <section className="block faq" id="questions">
        <h2>Questions fréquentes</h2>
        {faq.map((f) => (
          <details key={f.question}>
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
