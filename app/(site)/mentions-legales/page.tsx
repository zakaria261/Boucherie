import type { Metadata } from "next";
import { getSettings } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Mentions légales",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  const s = getSettings();
  const l = s.legal;
  return (
    <article className="page narrow legal">
      <h1>Mentions légales</h1>
      <h2>Éditeur du site</h2>
      <p>
        {l.company || s.name}
        {l.legalForm && (
          <>
            <br />
            {l.legalForm}
          </>
        )}
        <br />
        {s.address}
        {l.siren && (
          <>
            <br />
            SIREN : {l.siren}
          </>
        )}
        {s.phone && (
          <>
            <br />
            Téléphone : {s.phone}
          </>
        )}
        <br />
        E-mail : <a href={`mailto:${s.email}`}>{s.email}</a>
      </p>
      {l.director && (
        <>
          <h2>Responsable de la publication</h2>
          <p>{l.director}</p>
        </>
      )}
      {l.host && (
        <>
          <h2>Hébergement</h2>
          <p className="pre">{l.host}</p>
        </>
      )}
      <h2>Règlement des litiges</h2>
      <p>
        En cas de litige, le client peut recourir gratuitement à un médiateur
        de la consommation. Contactez d’abord la boucherie pour trouver une
        solution amiable.
      </p>
    </article>
  );
}
