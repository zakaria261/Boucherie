import { audit } from "@/lib/server/db";
import { actor, authorize, fail, jsonBody } from "@/lib/server/security";
import { assertCutKey, parseCutOverride, saveOverride } from "@/lib/server/cut-guide";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";
type Context = { params: Promise<{ key: string }> };

/** Enregistre la fiche d'un morceau (texte, photo, produits liés). */
export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await authorize(request);
    const key = decodeURIComponent((await params).key);
    const value = await parseCutOverride(key, await jsonBody(request, 30000));
    await saveOverride(key, value);
    await audit(actor(admin), "guide.modification", "cut", key);
    refreshSite();
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

/** Rétablit la fiche d'origine. */
export async function DELETE(request: Request, { params }: Context) {
  try {
    const admin = await authorize(request);
    const key = decodeURIComponent((await params).key);
    assertCutKey(key);
    await saveOverride(key, null);
    await audit(actor(admin), "guide.retablissement", "cut", key);
    refreshSite();
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
