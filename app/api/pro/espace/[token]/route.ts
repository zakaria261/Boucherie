import { audit, getCompanyByToken, saveCompany, transaction } from "@/lib/server/db";
import { fail, HttpError, jsonBody, rateLimit, sameOrigin, textField } from "@/lib/server/security";
import { validEmail, validPhone, validVat } from "@/lib/requests";

export const runtime = "nodejs";

/** Mise à jour des coordonnées depuis l'espace professionnel (lien privé). */
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    sameOrigin(request);
    const { token } = await params;
    if (!/^[a-f0-9]{48}$/.test(token)) throw new HttpError(404, "Espace introuvable.");
    await rateLimit(`espace:${token}`, 20, 60 * 60 * 1000);
    const body = await jsonBody(request);
    const name = textField(body.contactName, "Nom du contact", 120, 3);
    const phone = textField(body.phone, "Téléphone", 25, 8);
    const email = textField(body.email, "E-mail", 150, 3);
    if (!validPhone(phone)) throw new HttpError(400, "Vérifiez le numéro de téléphone.");
    if (!validEmail(email)) throw new HttpError(400, "Vérifiez l’adresse e-mail.");
    const vatNumber = textField(body.vatNumber ?? "", "TVA", 20, 0).replace(/[\s.-]/g, "").toUpperCase();
    if (vatNumber && !validVat(vatNumber)) throw new HttpError(400, "Numéro de TVA invalide.");
    const billingAddress = textField(body.billingAddress ?? "", "Adresse de facturation", 300, 0);
    await transaction(async () => {
      const company = await getCompanyByToken(token);
      if (!company) throw new HttpError(404, "Espace introuvable.");
      const contacts = [{ name, phone, email }, ...company.contacts.slice(1)];
      await saveCompany({ ...company, contacts, vatNumber, billingAddress, updatedAt: new Date().toISOString() });
      await audit("espace professionnel", "client.coordonnees", "company", company.id);
    });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
