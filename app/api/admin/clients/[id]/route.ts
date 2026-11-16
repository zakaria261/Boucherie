import { audit, getCompany, saveCompany, transaction } from "@/lib/server/db";
import { actor, authorize, fail, HttpError, jsonBody, textField } from "@/lib/server/security";
import { validEmail } from "@/lib/requests";
import type { Company } from "@/lib/types";

export const runtime = "nodejs";

/** Fiche entreprise : statut de validation, conditions convenues, contacts. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request, 30000);
    const company = await transaction(async () => {
      const current = await getCompany(id);
      if (!current) throw new HttpError(404, "Client introuvable.");
      if (body.version !== current.version) throw new HttpError(409, "Cette fiche a été modifiée ailleurs. Rechargez la page.");
      if (!Array.isArray(body.contacts) || !body.contacts.length || body.contacts.length > 10)
        throw new HttpError(400, "Indiquez au moins un contact.");
      const contacts = body.contacts.map((c: Record<string, unknown>) => {
        const email = textField(c.email ?? "", "E-mail du contact", 150, 0);
        if (email && !validEmail(email)) throw new HttpError(400, "E-mail de contact invalide.");
        return { name: textField(c.name, "Nom du contact", 120, 2), phone: textField(c.phone ?? "", "Téléphone", 25, 0), email };
      });
      const next: Company = {
        ...current,
        name: textField(body.name, "Nom de l’entreprise", 160, 2),
        billingAddress: textField(body.billingAddress ?? "", "Adresse", 300, 0),
        vatNumber: textField(body.vatNumber ?? "", "TVA", 20, 0),
        conditions: textField(body.conditions ?? "", "Conditions", 2000, 0),
        status: body.status === "Vérifiée" ? "Vérifiée" : "À vérifier",
        contacts,
        updatedAt: new Date().toISOString(),
        version: current.version + 1,
      };
      await saveCompany(next);
      await audit(actor(admin), "client.modification", "company", id, { status: next.status });
      return next;
    });
    return Response.json({ company });
  } catch (error) {
    return fail(error);
  }
}
