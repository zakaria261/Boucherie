import Link from "next/link";
import { getSettings } from "@/lib/server/db";
export const metadata = {
  title: "Informations & confidentialité | Boucherie du Faubourg",
};
export default function Informations() {
  const s = getSettings();
  return (
    <div className="legal">
      <Link href="/">← Retour à l’accueil</Link>
      <h1>Informations & confidentialité</h1>
      <h2>Votre boucherie</h2>
      <p>
        {s.name}
        <br />
        {s.address}
        <br />
        SIREN : 751 872 524.
        <br />
        Contact : <a href={`mailto:${s.email}`}>{s.email}</a>.
      </p>
      <h2>Commandes et retrait</h2>
      <p>
        Les prix sont exprimés en euros par kilogramme. Le panier affiche une
        estimation selon le poids souhaité ; le montant final dépend du poids
        réellement préparé. Les demandes doivent être passées la veille pour le
        lendemain et restent soumises à la disponibilité des produits et à la
        confirmation de la boucherie. Aucun paiement n’est effectué sur le site.
      </p>
      <p>
        Une commande Click & Collect ouvre un message WhatsApp prérempli à
        destination de la boucherie. Le client l’envoie depuis son propre compte
        WhatsApp ; la boucherie confirme alors la disponibilité et le créneau de
        retrait dans la conversation. Pour les ingrédients, les allergènes et la
        provenance, contactez la boucherie avant de commander.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Le panier est conservé localement dans votre navigateur. Lors d’une
        commande Click & Collect, le site prépare un message avec votre nom,
        votre téléphone, la date souhaitée, votre sélection et vos éventuelles
        précisions. Ce message est ouvert dans WhatsApp et n’est pas enregistré
        par le site avant son envoi.
      </p>
      <p>
        Une fois envoyé, le message est traité dans WhatsApp selon ses propres
        règles. La boucherie utilise les informations reçues dans cette
        conversation pour préparer et confirmer le retrait.
      </p>
      <p>
        Pour toute question concernant vos données ou une demande d’accès, de
        rectification ou de suppression, écrivez à la boucherie à l’adresse
        ci-dessus. Le site ne comporte pas de mesure d’audience ni de publicité.
        Un cookie de session est utilisé pour l’espace propriétaire.
      </p>
      <h2>Photographies</h2>
      <p>
        Le logo et les photographies produits proviennent du site d’origine de
        la Boucherie du Faubourg ou sont ajoutés par son propriétaire. Le visuel
        d’ambiance initial provient d’Unsplash. Les photographies sont
        indicatives.
      </p>
      <h2>Informations de publication</h2>
      <p>
        Avant l’ouverture commerciale, l’éditeur complétera les informations
        d’hébergement, les conditions de vente et de retrait ainsi que la durée
        de conservation des demandes. Pour toute question, contactez la
        boucherie.
      </p>
    </div>
  );
}
