import { randomBytes } from "node:crypto";
import { audit, getCompany, saveCompany, transaction } from "@/lib/server/db";
import { actor, authorize, fail, HttpError, jsonBody, textField } from "@/lib/server/security";

export const runtime = "nodejs";

/** Note interne sur un client professionnel (échanges, tarifs convenus…). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const text = textField((await jsonBody(request)).text, "Note", 2000);
    const company = await transaction(async () => {
      const current = await getCompany(id);
      if (!current) throw new HttpError(404, "Client introuvable.");
      const next = {
        ...current,
        internalNotes: [...current.internalNotes, { id: randomBytes(6).toString("hex"), at: new Date().toISOString(), by: actor(admin), text }],
      };
      await saveCompany(next);
      await audit(actor(admin), "client.note", "company", id);
      return next;
    });
    return Response.json({ company });
  } catch (error) {
    return fail(error);
  }
}
