import { exec, one, getPromotion, savePromotion } from "@/lib/server/db";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validatePromotion } from "@/lib/server/catalog";

type Context = { params: Promise<{ id: string }> };

async function load(request: Request, { params }: Context) {
  await authorize(request);
  const { id } = await params;
  const body = await jsonBody(request);
  const current = await getPromotion(id);
  if (!current) throw new HttpError(404, "Promotion introuvable.");
  if (body.version !== current.version)
    throw new HttpError(409, "Cette promotion a changé. Rechargez la page.");
  return { body, current };
}

export async function PUT(request: Request, context: Context) {
  try {
    const { body, current } = await load(request, context);
    const promotion = {
      ...current,
      ...(await validatePromotion(body)),
      version: current.version + 1,
    };
    await savePromotion(promotion);
    return Response.json({ promotion });
  } catch (error) {
    return fail(error);
  }
}

/** Activation ou arrêt immédiat. */
export async function PATCH(request: Request, context: Context) {
  try {
    const { body, current } = await load(request, context);
    if (typeof body.active !== "boolean")
      throw new HttpError(400, "Activation invalide.");
    const promotion = {
      ...current,
      active: body.active,
      version: current.version + 1,
    };
    await savePromotion(promotion);
    return Response.json({ promotion });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { current } = await load(request, context);
    await exec("DELETE FROM promotions WHERE id = ?", current.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
