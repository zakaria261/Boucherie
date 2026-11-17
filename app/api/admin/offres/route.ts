import { audit } from "@/lib/server/db";
import { actor, authorize, fail, jsonBody } from "@/lib/server/security";
import { parseOffers, saveOffers } from "@/lib/server/offers";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";

/** Enregistre les lots et les marinades. */
export async function PUT(request: Request) {
  try {
    const admin = await authorize(request);
    const offers = parseOffers(await jsonBody(request, 80000));
    await saveOffers(offers);
    await audit(actor(admin), "offres.modification", "offers", "offres", { lots: offers.lots.length, marinades: offers.marinades.length });
    refreshSite();
    return Response.json({ offers });
  } catch (error) {
    return fail(error);
  }
}
