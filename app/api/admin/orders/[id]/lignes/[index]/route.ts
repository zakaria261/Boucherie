import { actor, authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { parsePrepPatch, updatePrep } from "@/lib/server/orders";

export const runtime = "nodejs";

/** Coche une ligne, ou renseigne poids préparé, remplacement et prix final. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    const admin = await authorize(request);
    const { id, index } = await params;
    const n = Number(index);
    if (!Number.isInteger(n) || n < 0 || n > 200) throw new HttpError(400, "Ligne invalide.");
    const body = await jsonBody(request);
    const order = await updatePrep(id, n, body.name, parsePrepPatch(body), actor(admin));
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
