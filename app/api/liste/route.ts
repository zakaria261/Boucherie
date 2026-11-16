import { fail, jsonBody, rateLimit, sameOrigin } from "@/lib/server/security";
import { createRequestOrder } from "@/lib/server/orders";
import { one, saveOrder } from "@/lib/server/db";
import { parseListeRequest } from "@/lib/server/requests";
import { notifyOwnerNewOrder } from "@/lib/server/push";

export const runtime = "nodejs";

/**
 * Enregistre une liste de courses libre. La demande est écrite en base avant
 * toute réponse de succès ; la notification de l'équipe vient ensuite et son
 * échec n'annule rien. Un même requestKey renvoie la même demande.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const draft = parseListeRequest(await jsonBody(request, 60000));
    const prior = await one<{ id: string; token: string }>(
      "SELECT id, token FROM orders WHERE request_key = ?",
      draft.key,
    );
    if (prior) return Response.json({ id: prior.id, token: prior.token, repeated: true });
    await rateLimit(`liste:${draft.phone.replace(/\D/g, "")}`, 6, 60 * 60 * 1000);
    await rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = await createRequestOrder({ ...draft, origin: "liste" });
    if (created) {
      order.push = await notifyOwnerNewOrder(order).catch(() => "failed" as const);
      await saveOrder(order);
    }
    return Response.json({ id: order.id, token: order.token }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
