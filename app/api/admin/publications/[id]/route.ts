import { exec, one, getPost, savePost } from "@/lib/server/db";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validatePost } from "@/lib/server/catalog";

type Context = { params: Promise<{ id: string }> };

async function load(request: Request, { params }: Context) {
  await authorize(request);
  const { id } = await params;
  const body = await jsonBody(request);
  const current = await getPost(id);
  if (!current) throw new HttpError(404, "Publication introuvable.");
  if (body.version !== current.version)
    throw new HttpError(409, "Cette publication a changé. Rechargez la page.");
  return { body, current };
}

export async function PUT(request: Request, context: Context) {
  try {
    const { body, current } = await load(request, context);
    const post = {
      ...current,
      ...(await validatePost(body)),
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    await savePost(post);
    return Response.json({ post });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { current } = await load(request, context);
    await exec("DELETE FROM posts WHERE id = ?", current.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
