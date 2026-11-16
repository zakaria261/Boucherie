import { fail, HttpError, jsonBody, rateLimit, sameOrigin } from "@/lib/server/security";
import { createRequestOrder } from "@/lib/server/orders";
import { createQuoteRequest } from "@/lib/server/quotes";
import { one, saveOrder, transaction } from "@/lib/server/db";
import { parseProRequest, upsertCompany } from "@/lib/server/requests";
import { notifyOwnerNewOrder, notifyOwnerNewQuote } from "@/lib/server/push";

export const runtime = "nodejs";

/**
 * Demande professionnelle, sans compte. « devis » → file Devis ;
 * « commande » → file des demandes, à valider avant toute préparation.
 * La fiche entreprise est créée ou complétée dans la même transaction.
 * Aucun e-mail n'est envoyé : aucun service d'envoi n'est configuré.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const draft = parseProRequest(await jsonBody(request, 80000));
    const table = draft.details.requestType === "devis" ? "quotes" : "orders";
    const prior = await one<{ token: string }>(`SELECT token FROM ${table} WHERE request_key = ?`, draft.key);
    if (prior) return Response.json({ token: prior.token, repeated: true });
    await rateLimit(`pro:${draft.details.email.toLowerCase()}`, 6, 60 * 60 * 1000);
    await rateLimit("orders-global", 150, 60 * 60 * 1000);

    if (draft.details.requestType === "devis") {
      const { quote, created } = await transaction(async () => {
        const company = await upsertCompany(draft.details);
        return createQuoteRequest({ ...draft, companyId: company.id });
      });
      if (created) await notifyOwnerNewQuote(quote).catch(() => "failed");
      return Response.json({ id: quote.id, token: quote.token, type: "devis" }, { status: created ? 201 : 200 });
    }

    if (!draft.date) throw new HttpError(400, "Indiquez la date de retrait souhaitée.");
    const [firstName, ...rest] = draft.details.contactName.split(/\s+/);
    const { order, created } = await transaction(async () => {
      const company = await upsertCompany(draft.details);
      return createRequestOrder({
        key: draft.key,
        origin: "pro",
        firstName,
        lastName: rest.join(" "),
        phone: draft.details.phone,
        email: draft.details.email,
        date: draft.date,
        time: draft.time,
        notes: draft.notes,
        items: draft.items,
        pro: draft.details,
        companyId: company.id,
      });
    });
    if (created) {
      order.push = await notifyOwnerNewOrder(order).catch(() => "failed" as const);
      await saveOrder(order);
    }
    return Response.json({ id: order.id, token: order.token, type: "commande" }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
