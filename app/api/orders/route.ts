import { fail, jsonBody, rateLimit, sameOrigin } from "@/lib/server/security";
import { createOrder, parseOrderRequest } from "@/lib/server/orders";
import { exec, one, saveOrder } from "@/lib/server/db";
import { notifyNewOrder } from "@/lib/server/whatsapp";
import { notifyOwnerNewOrder } from "@/lib/server/push";

export const runtime = "nodejs";

/**
 * Enregistre une commande Click & Collect. La commande est d'abord écrite en
 * base ; les notifications (WhatsApp Cloud API, Web Push) sont tentées ensuite
 * et leur échec n'empêche jamais l'enregistrement.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const draft = parseOrderRequest(await jsonBody(request));
    // Un nouvel essai (double appui, réseau instable) renvoie la même commande
    // sans être compté dans les limites anti-abus.
    const prior = await one<{ id: string; token: string }>(
      "SELECT id, token FROM orders WHERE request_key = ?",
      draft.key,
    );
    if (prior)
      return Response.json({
        id: prior.id,
        token: prior.token,
        repeated: true,
      });
    await rateLimit(
      `order:${draft.phone.replace(/\D/g, "")}`,
      8,
      60 * 60 * 1000,
    );
    await rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = await createOrder(draft);
    if (!created)
      return Response.json({
        id: order.id,
        token: order.token,
        repeated: true,
      });
    const [whatsapp, push] = await Promise.all([
      notifyNewOrder(order).catch(
        () => ({ owner: "failed", customer: "failed" }) as const,
      ),
      notifyOwnerNewOrder(order).catch(() => "failed" as const),
    ]);
    order.whatsappNotifications = whatsapp;
    order.push = push;
    await saveOrder(order);
    return Response.json({ id: order.id, token: order.token }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
