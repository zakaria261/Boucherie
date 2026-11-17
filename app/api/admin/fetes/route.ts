import { audit } from "@/lib/server/db";
import { actor, authorize, fail, jsonBody } from "@/lib/server/security";
import { parseFestive, saveFestive } from "@/lib/server/fetes";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";

/** Enregistre le catalogue des fêtes (textes, visibilité). */
export async function PUT(request: Request) {
  try {
    const admin = await authorize(request);
    const catalog = parseFestive(await jsonBody(request, 120000));
    await saveFestive(catalog);
    await audit(actor(admin), "fetes.modification", "festive", "catalogue-fetes", {
      visible: catalog.visible,
      produits: catalog.sections.reduce((n, s) => n + s.items.length, 0),
    });
    refreshSite();
    return Response.json({ catalog });
  } catch (error) {
    return fail(error);
  }
}
