import { fail, HttpError, jsonBody, rateLimit, sameOrigin } from "@/lib/server/security";
import { createRequestOrder, parseCartLines } from "@/lib/server/orders";
import { one, saveOrder } from "@/lib/server/db";
import { parseListeRequest } from "@/lib/server/requests";
import { notifyOwnerNewOrder } from "@/lib/server/push";

export const runtime = "nodejs";

/**
 * Enregistre une liste de courses libre, avec le panier si le client l'a
 * joint (prix, stock et promotions vérifiés comme pour une commande). La demande est écrite en base avant
 * toute réponse de succès ; la notification de l'équipe vient ensuite et son
 * échec n'annule rien. Un même requestKey renvoie la même demande.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 80000);
    const draft = parseListeRequest(body);
    // Panier joint à la liste, si le client l'a souhaité : une seule demande.
    const cart = body.cart === undefined ? [] : body.cart;
    if (!Array.isArray(cart) || cart.length > 100) throw new HttpError(400, "Panier invalide.");
    const catalog = parseCartLines(cart);
    const prior = await one<{ id: string; token: string }>(
      "SELECT id, token FROM orders WHERE request_key = ?",
      draft.key,
    );
    if (prior) return Response.json({ id: prior.id, token: prior.token, repeated: true });
    await rateLimit(`liste:${draft.phone.replace(/\D/g, "")}`, 6, 60 * 60 * 1000);
    await rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = await createRequestOrder({ ...draft, origin: "liste", catalog });
    if (created) {
      order.push = await notifyOwnerNewOrder(order).catch(() => "failed" as const);
      await saveOrder(order);
    }
    return Response.json({ id: order.id, token: order.token }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
