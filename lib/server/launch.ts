import { getProducts, getSettings } from "./db";
import { subscriptionCount } from "./push";

const GENERIC =
  "Sélectionné et préparé avec soin par nos artisans bouchers. Une belle pièce pour retrouver le plaisir de cuisiner et de partager.";

/** Points à compléter avant l'ouverture au public, sans rien supposer. */
export async function launchChecklist() {
  const s = await getSettings();
  const products = await getProducts(true);
  const subscriptions = await subscriptionCount();
  const noInfo = products.filter((p) => !p.origin && !p.allergens).length;
  const generic = products.filter((p) => p.description === GENERIC).length;
  const origin = process.env.APP_ORIGIN || "";
  return [
    {
      label: "Horaires vérifiés",
      done: s.pickup.verified,
      href: "/admin/plus/retraits",
      hint: "Repris de l’ancien site : à confirmer.",
    },
    {
      label: "Notifications de commande activées",
      done: subscriptions > 0,
      href: "/admin/plus/notifications",
    },
    {
      label: "Mentions légales complètes",
      done: !!(s.legal.legalForm && s.legal.director && s.legal.host),
      href: "/admin/plus/boutique",
      hint: "Forme juridique, responsable de la publication, hébergeur.",
    },
    {
      label: "Origine et allergènes des produits",
      done: noInfo === 0,
      href: "/admin/produits",
      hint: noInfo
        ? `${noInfo} produits sans origine ni allergènes renseignés.`
        : undefined,
    },
    {
      label: "Descriptions des produits",
      done: generic === 0,
      href: "/admin/produits",
      hint: generic
        ? `${generic} produits ont encore la description générique.`
        : undefined,
    },
    {
      label: "Numéro WhatsApp (facultatif)",
      done: !!s.whatsapp,
      href: "/admin/plus/boutique",
    },
    {
      label: "Adresse du site en HTTPS (APP_ORIGIN)",
      done: origin.startsWith("https://"),
      hint: origin ? origin : "Réglage serveur à faire par l’hébergeur.",
    },
  ];
}
