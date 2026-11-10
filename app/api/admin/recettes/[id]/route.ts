import { exec, one, getRecipe, saveRecipe } from "@/lib/server/db";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validateRecipe } from "@/lib/server/catalog";

type Context = { params: Promise<{ id: string }> };

async function load(request: Request, { params }: Context) {
  await authorize(request);
  const { id } = await params;
  const body = await jsonBody(request, 60000);
  const current = await getRecipe(id);
  if (!current) throw new HttpError(404, "Recette introuvable.");
  if (body.version !== current.version)
    throw new HttpError(409, "Cette recette a changé. Rechargez la page.");
  return { body, current };
}

export async function PUT(request: Request, context: Context) {
  try {
    const { body, current } = await load(request, context);
    const recipe = {
      ...current,
      ...(await validateRecipe(body)),
      version: current.version + 1,
    };
    await saveRecipe(recipe);
    return Response.json({ recipe });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { current } = await load(request, context);
    await exec("DELETE FROM recipes WHERE id = ?", current.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
