import { revalidatePath } from "next/cache";

/**
 * Régénère les pages publiques (servies en statique par le CDN) après une
 * modification du catalogue, des promotions, des publications, des réglages
 * ou d'un stock (commande, annulation).
 */
export function refreshSite() {
  revalidatePath("/", "layout");
}
