import { refreshSite } from "@/lib/server/refresh";
import { audit, exec, getSettings } from "@/lib/server/db";
import { actor, authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { validateSettings } from "@/lib/server/catalog";
export async function PUT(request: Request) {
  try {
    const admin = await authorize(request, "owner");
    const body = await jsonBody(request);
    if (!Number.isInteger(body.version))
      throw new HttpError(400, "Version manquante.");
    const settings = {
      ...validateSettings(body, await getSettings()),
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
    await audit(actor(admin), "reglages.modification", "settings", "1");
    refreshSite();
    return Response.json({ settings });
  } catch (error) {
    return fail(error);
  }
}
