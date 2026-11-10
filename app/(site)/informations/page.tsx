import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/server/db";

export const metadata: Metadata = {
  title: "Commandes et confidentialité",
  alternates: { canonical: "/informations" },
};

export default function Informations() {
  const s = getSettings();
  return (
    <article className="page narrow legal">
      <h1>Commandes et confidentialité</h1>
      <h2>Commandes et retrait</h2>
      <p>
        Les commandes passées sur le site sont des réservations pour un retrait
        en boutique, au {s.address}. Le prix affiché est une estimation calculée
        sur le poids demandé ; le montant final dépend du poids réellement
        préparé. Aucun paiement n’est effectué en ligne : le règlement se fait
        en boutique, au retrait. Les commandes restent soumises à la
        disponibilité des produits et à la confirmation de la boucherie.
      </p>
      <p>
        Les promotions s’appliquent dans la limite de leurs dates et des
        quantités annoncées. Un produit indiqué « Prêt aujourd’hui » peut être
        retiré le jour même ; les autres commandes demandent un délai de
        préparation indiqué au moment de commander.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Pour préparer votre commande, nous enregistrons votre nom, votre
        téléphone, votre e-mail s’il est renseigné, le créneau de retrait, les
        produits choisis et vos précisions. Ces informations servent
        uniquement à préparer votre commande et à vous contacter à son sujet.
        Elles ne sont ni vendues ni utilisées à des fins publicitaires.
      </p>
      <p>
        Votre panier, et vos coordonnées si vous choisissez de les mémoriser,
        sont conservés dans votre navigateur. Vous pouvez les effacer à tout
        moment depuis les réglages de votre navigateur.
      </p>
      <p>
        Le message WhatsApp proposé après une commande est facultatif : il
        n’est envoyé que si vous appuyez vous-même sur Envoyer dans WhatsApp,
        et il est alors traité selon les règles de WhatsApp.
      </p>
      <p>
        Pour exercer vos droits d’accès, de rectification ou de suppression,
        écrivez à <a href={`mailto:${s.email}`}>{s.email}</a>. Le site
        n’utilise ni mesure d’audience ni publicité. Un cookie technique sert
        uniquement à la connexion de l’espace boucher.
      </p>
      <h2>Photographies</h2>
      <p>
        Les photographies des produits sont indicatives. Le logo et les photos
        proviennent de la Boucherie du Faubourg ou ont été ajoutés par son
        propriétaire.
      </p>
      <p>
        Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
      </p>
    </article>
  );
}
