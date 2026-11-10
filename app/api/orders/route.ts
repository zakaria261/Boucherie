import { fail, jsonBody, rateLimit, sameOrigin } from "@/lib/server/security";
import { createOrder, parseOrderRequest } from "@/lib/server/orders";
import { db, saveOrder } from "@/lib/server/db";
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
    const prior = db()
      .prepare("SELECT id, token FROM orders WHERE request_key = ?")
      .get(draft.key) as { id: string; token: string } | undefined;
    if (prior) return Response.json({ ...prior, repeated: true });
    rateLimit(`order:${draft.phone.replace(/\D/g, "")}`, 8, 60 * 60 * 1000);
    rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = createOrder(draft);
    if (!created)
      return Response.json({ id: order.id, token: order.token, repeated: true });
    const [whatsapp, push] = await Promise.all([
      notifyNewOrder(order).catch(
        () => ({ owner: "failed", customer: "failed" }) as const,
      ),
      notifyOwnerNewOrder(order).catch(() => "failed" as const),
    ]);
    order.whatsappNotifications = whatsapp;
    order.push = push;
    saveOrder(order);
    return Response.json({ id: order.id, token: order.token }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
