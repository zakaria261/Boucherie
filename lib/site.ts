/** Adresse publique du site, utilisée pour le SEO et les liens absolus. */
export const siteUrl = (
  process.env.APP_ORIGIN || "https://www.boucheriedufaubourg-amiens.com"
).replace(/\/$/, "");

/** Itinéraire vers la boutique (fonctionne sur iPhone, Android et ordinateur). */
export const directionsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
