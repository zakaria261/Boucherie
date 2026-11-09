import { randomBytes } from "node:crypto";
import { db, getProduct } from "@/lib/server/db";
import {
  fail,
  HttpError,
  jsonBody,
  rateLimit,
  sameOrigin,
  textField,
} from "@/lib/server/security";
import { linePrice, tomorrow } from "@/lib/shop";
import type { Order, OrderItem } from "@/lib/types";
import { notifyNewOrder } from "@/lib/server/whatsapp";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    const key = textField(body.requestKey, "Identifiant", 50);
    if (!/^[a-f0-9-]{36}$/.test(key))
      throw new HttpError(400, "Identifiant invalide.");
    const prior = db()
      .prepare("SELECT data FROM orders WHERE request_key = ?")
      .get(key) as { data: string } | undefined;
    if (prior) {
      const order = JSON.parse(prior.data) as Order;
      return Response.json({ id: order.id, token: order.token });
    }
    const name = textField(body.name, "Nom", 100, 2),
      email = textField(body.email || "", "E-mail", 150, 0),
      phone = textField(body.phone, "Téléphone", 25, 8),
      date = textField(body.date, "Date", 10),
      notes = textField(body.notes || "", "Précisions", 1000, 0);
    if (
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !/^\+?[\d\s().-]{8,25}$/.test(phone)
    )
      throw new HttpError(400, "Vérifiez votre e-mail et votre téléphone.");
    const max = new Date();
    max.setDate(max.getDate() + 60);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date < tomorrow() ||
      date > max.toISOString().slice(0, 10)
    )
      throw new HttpError(
        400,
        "Choisissez un retrait entre demain et les 60 prochains jours.",
      );
    if (typeof body.whatsappOptIn !== "boolean")
      throw new HttpError(400, "Préférence WhatsApp invalide.");
    if (
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 100
    )
      throw new HttpError(
        400,
        "Le panier doit contenir entre 1 et 100 lignes.",
      );
    const seen = new Set<string>();
    const items: OrderItem[] = body.items.map((item: unknown) => {
      if (!item || typeof item !== "object")
        throw new HttpError(400, "Panier invalide.");
      const row = item as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        ![250, 500, 1000, 1500, 2000].includes(Number(row.grams)) ||
        !Number.isInteger(row.grams) ||
        !Number.isInteger(row.quantity) ||
        Number(row.quantity) < 1 ||
        Number(row.quantity) > 20
      )
        throw new HttpError(400, "Quantité invalide.");
      const p = getProduct(row.id);
      if (!p?.published || !p.available)
        throw new HttpError(
          409,
          "Un produit n’est plus disponible. Actualisez votre panier.",
        );
      if (row.price !== p.price)
        throw new HttpError(
          409,
          "Un tarif a changé. Actualisez la page pour vérifier le nouveau total.",
        );
      const unique = `${p.id}:${row.grams}`;
      if (seen.has(unique)) throw new HttpError(400, "Article en double.");
      seen.add(unique);
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        grams: Number(row.grams),
        quantity: Number(row.quantity),
        total: linePrice(p.price, Number(row.grams), Number(row.quantity)),
      };
    });
    rateLimit(`order:${phone.replace(/\D/g, "")}`, 5, 60 * 60 * 1000);
    rateLimit("orders-global", 150, 60 * 60 * 1000);
    const order: Order = {
      id: `FB-${randomBytes(4).toString("hex").toUpperCase()}`,
      token: randomBytes(24).toString("hex"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "Nouvelle",
      name,
      email,
      phone,
      whatsappOptIn: body.whatsappOptIn,
      date,
      notes,
      items,
      total: items.reduce((sum, i) => sum + i.total, 0),
    };
    db()
      .prepare("INSERT INTO orders VALUES (?,?,?,?)")
      .run(order.id, order.token, key, JSON.stringify(order));
    order.whatsappNotifications = await notifyNewOrder(order);
    db()
      .prepare("UPDATE orders SET data = ? WHERE id = ?")
      .run(JSON.stringify(order), order.id);
    return Response.json({ id: order.id, token: order.token }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
