import { db, getProduct } from "@/lib/server/db";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validateProduct } from "@/lib/server/catalog";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    if (!getProduct(id)) throw new HttpError(404, "Produit introuvable.");
    if (!Number.isInteger(body.version))
      throw new HttpError(400, "Version manquante.");
    const product = {
      ...validateProduct(body),
      id,
      version: Number(body.version) + 1,
    };
    const result = db()
      .prepare(
        "UPDATE products SET data = ? WHERE id = ? AND json_extract(data,'$.version') = ?",
      )
      .run(JSON.stringify(product), id, Number(body.version));
    if (!result.changes)
      throw new HttpError(
        409,
        "Ce produit a été modifié ailleurs. Rechargez la page avant de réessayer.",
      );
    return Response.json({ product });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    if (!Number.isInteger(body.version))
      throw new HttpError(400, "Version manquante.");
    const result = db()
      .prepare(
        "DELETE FROM products WHERE id = ? AND json_extract(data,'$.version') = ?",
      )
      .run(id, Number(body.version));
    if (!result.changes)
      throw new HttpError(409, "Ce produit a changé. Rechargez la page.");
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
