import { exec, one } from "@/lib/server/db";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validateSettings } from "@/lib/server/catalog";
export async function PUT(request: Request) {
  try {
    await authorize(request);
    const body = await jsonBody(request);
    if (!Number.isInteger(body.version))
      throw new HttpError(400, "Version manquante.");
    const settings = {
      ...validateSettings(body),
      version: Number(body.version) + 1,
    };
    const result = await exec(
      "UPDATE settings SET data = ? WHERE id = 1 AND (data::jsonb->>'version')::int = ?",
      JSON.stringify(settings),
      Number(body.version),
    );
    if (!result.rowsAffected)
      throw new HttpError(
        409,
        "Les informations ont été modifiées ailleurs. Rechargez la page.",
      );
    return Response.json({ settings });
  } catch (error) {
    return fail(error);
  }
}
