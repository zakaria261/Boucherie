import { quoteStatuses, type QuoteStatus } from "@/lib/types";
import { actor, authorize, fail, HttpError, jsonBody, textField } from "@/lib/server/security";
import { changeQuoteStatus, parseCustomer, parseLines, updateQuote } from "@/lib/server/quotes";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Contenu du devis : client, lignes, validité, conditions, message. */
export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request, 60000);
    const quote = await updateQuote(
      id,
      body.version,
      {
        customer: parseCustomer(body.customer),
        lines: parseLines(body.lines),
        validUntil: textField(body.validUntil ?? "", "Validité", 10, 0),
        conditions: textField(body.conditions ?? "", "Conditions", 1500, 0),
        message: textField(body.message ?? "", "Message", 1500, 0),
      },
      actor(admin),
    );
    return Response.json({ quote });
  } catch (error) {
    return fail(error);
  }
}

/** Changement d'étape (établi, envoyé, accepté, refusé…), contrôlé côté serveur. */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    if (!(quoteStatuses as readonly unknown[]).includes(body.status)) throw new HttpError(400, "Statut invalide.");
    const quote = await changeQuoteStatus(id, body.status as QuoteStatus, body.version, actor(admin));
    return Response.json({ quote });
  } catch (error) {
    return fail(error);
  }
}
