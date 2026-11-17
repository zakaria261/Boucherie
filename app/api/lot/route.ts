import { fail, HttpError, jsonBody, rateLimit, sameOrigin, textField } from "@/lib/server/security";
import { createRequestOrder } from "@/lib/server/orders";
import { one, saveOrder } from "@/lib/server/db";
import { getOffers } from "@/lib/server/offers";
import { parseListeRequest } from "@/lib/server/requests";
import { notifyOwnerNewOrder } from "@/lib/server/push";
import type { FreeItem } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Commande d'un lot. Le prix vient du serveur (jamais du navigateur) ; la
 * commande arrive « Demande reçue » dans l'application, comme les autres.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 20000);
    const { lots, marinades } = await getOffers();
    const lot = lots.find((l) => l.visible && l.id === body.lotId);
    if (!lot) throw new HttpError(409, "Ce lot n’est plus proposé. Actualisez la page.");
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new HttpError(400, "Nombre de lots invalide (1 à 10).");
    let marinade = "";
    if (body.marinade) {
      const found = marinades.find((m) => m.visible && m.id === body.marinade);
      if (!lot.marinade || !found) throw new HttpError(400, "Marinade invalide.");
      marinade = found.name;
    }
    // Coordonnées, créneau et précisions : mêmes règles que la liste de courses.
    const draft = parseListeRequest({ ...body, items: [{ name: lot.name, quantity: String(quantity), unit: "piece" }] });
    const item: FreeItem = {
      kind: "libre",
      name: lot.name,
      quantity,
      unit: "piece",
      note: [lot.items.join(" · "), marinade && `Marinade : ${marinade}`].filter(Boolean).join(" — "),
      price: lot.price,
      total: lot.price * quantity,
    };
    const prior = await one<{ id: string; token: string }>("SELECT id, token FROM orders WHERE request_key = ?", draft.key);
    if (prior) return Response.json({ id: prior.id, token: prior.token, repeated: true });
    await rateLimit(`lot:${draft.phone.replace(/\D/g, "")}`, 6, 60 * 60 * 1000);
    await rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = await createRequestOrder({
      ...draft,
      notes: textField(body.notes ?? "", "Précisions", 1000, 0),
      origin: "lot",
      days: lot.days,
      items: [item],
    });
    if (created) {
      order.push = await notifyOwnerNewOrder(order).catch(() => "failed" as const);
      await saveOrder(order);
    }
    return Response.json({ id: order.id, token: order.token }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
