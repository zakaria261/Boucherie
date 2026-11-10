import { randomBytes } from "node:crypto";
import {
  getOrderById,
  one,
  exec,
  getProduct,
  getPromotions,
  getSettings,
  promotionLive,
  saveOrder,
  saveProduct,
  savePromotion,
  slotLoad,
  transaction,
} from "./db";
import { HttpError, textField } from "./security";
import { normalizeOrder } from "./normalize";
import { pickupError } from "../pickup";
import {
  cartKey,
  formatStock,
  linePrice,
  MAX_QUANTITY,
  stockNeed,
  weightsFor,
} from "../shop";
import {
  transitions,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
} from "../types";

function validOptions(product: Product, value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > product.preparations.length)
    throw new HttpError(400, "Options de préparation invalides.");
  const allowed = new Set(
    product.preparations.flatMap((o) =>
      o.choices.length ? o.choices.map((c) => `${o.name} : ${c}`) : [o.name],
    ),
  );
  const names = new Set<string>();
  return value.map((option) => {
    if (typeof option !== "string" || !allowed.has(option))
      throw new HttpError(
        409,
        `Les options de préparation de « ${product.name} » ont changé. Vérifiez votre panier.`,
      );
    const name = option.split(" : ")[0];
    if (names.has(name))
      throw new HttpError(400, "Options de préparation invalides.");
    names.add(name);
    return option;
  });
}

type Draft = Omit<Order, "id" | "token" | "items" | "total" | "history"> & {
  key: string;
  lines: {
    product: string;
    grams: number;
    quantity: number;
    price: number;
    options: string[];
  }[];
};

/** Lecture et validation de la requête, sans accès en écriture. */
export function parseOrderRequest(body: Record<string, unknown>): Draft {
  const key = textField(body.requestKey, "Identifiant", 50);
  if (!/^[a-f0-9-]{36}$/.test(key))
    throw new HttpError(400, "Identifiant invalide.");
  const name = textField(body.name, "Nom", 100, 2),
    email = textField(body.email || "", "E-mail", 150, 0),
    phone = textField(body.phone, "Téléphone", 25, 8),
    date = textField(body.date, "Date", 10),
    time = textField(body.time || "", "Heure", 5, 0),
    notes = textField(body.notes || "", "Précisions", 1000, 0);
  if (
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !/^\+?[\d\s().-]{8,25}$/.test(phone)
  )
    throw new HttpError(400, "Vérifiez votre e-mail et votre téléphone.");
  if (typeof body.whatsappOptIn !== "boolean")
    throw new HttpError(400, "Préférence WhatsApp invalide.");
  if (
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > 100
  )
    throw new HttpError(400, "Le panier doit contenir entre 1 et 100 lignes.");
  const lines = body.items.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new HttpError(400, "Panier invalide.");
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !Number.isInteger(row.grams) ||
      !Number.isInteger(row.quantity) ||
      Number(row.quantity) < 1 ||
      Number(row.quantity) > MAX_QUANTITY
    )
      throw new HttpError(400, "Quantité invalide.");
    return {
      product: row.id,
      grams: Number(row.grams),
      quantity: Number(row.quantity),
      price: Number(row.price),
      options: row.options as string[],
    };
  });
  const now = new Date().toISOString();
  return {
    key,
    createdAt: now,
    updatedAt: now,
    status: "Nouvelle",
    name,
    email,
    phone,
    whatsappOptIn: body.whatsappOptIn,
    date,
    time,
    notes,
    lines,
  };
}

/**
 * Enregistre la commande. Tout se passe dans une transaction exclusive :
 * prix, disponibilité, stock, quantités promotionnelles et capacité du
 * créneau sont vérifiés et réservés ensemble, sans double vente possible.
 * Un même requestKey renvoie toujours la même commande.
 */
export function createOrder(draft: Draft, now = new Date()) {
  return transaction(async () => {
    const prior = await one<{ data: string }>(
      "SELECT data FROM orders WHERE request_key = ?",
      draft.key,
    );
    if (prior)
      return { order: JSON.parse(prior.data) as Order, created: false };

    const settings = await getSettings();
    const promotions = (await getPromotions()).filter((p) =>
      promotionLive(p, now),
    );
    const products = new Map<string, Product>();
    const needs = new Map<string, number>();
    const promoNeeds = new Map<string, number>();
    const seen = new Set<string>();
    const items: OrderItem[] = [];
    for (const line of draft.lines) {
      const product =
        products.get(line.product) || (await getProduct(line.product));
      if (!product?.published || !product.available)
        throw new HttpError(
          409,
          "Un produit n’est plus disponible. Actualisez votre panier.",
        );
      products.set(product.id, product);
      if (!weightsFor(product).includes(line.grams))
        throw new HttpError(400, "Quantité invalide.");
      const options = validOptions(product, line.options);
      const unique = cartKey({
        id: product.id,
        grams: line.grams,
        quantity: 1,
        options,
      });
      if (seen.has(unique)) throw new HttpError(400, "Article en double.");
      seen.add(unique);
      const promo = promotions
        .filter((p) => p.productId === product.id && p.price < product.price)
        .sort((a, b) => a.price - b.price)[0];
      const unitPrice = promo ? promo.price : product.price;
      if (line.price !== unitPrice)
        throw new HttpError(
          409,
          "Un tarif a changé. Actualisez la page pour vérifier le nouveau total.",
        );
      const need = stockNeed(product.unit, line.grams, line.quantity);
      needs.set(product.id, (needs.get(product.id) || 0) + need);
      if (promo)
        promoNeeds.set(promo.id, (promoNeeds.get(promo.id) || 0) + need);
      items.push({
        id: product.id,
        name: product.name,
        unit: product.unit,
        grams: line.grams,
        quantity: line.quantity,
        price: unitPrice,
        ...(promo
          ? { regularPrice: product.price, promotionId: promo.id }
          : {}),
        total: linePrice(unitPrice, line.grams, line.quantity, product.unit),
        options,
      });
    }

    const sameDay = [...products.values()].every((p) => p.readyToday);
    const problem = pickupError(
      settings.pickup,
      draft.date,
      draft.time,
      sameDay,
      now,
    );
    if (problem) throw new HttpError(400, problem);
    if (settings.pickup.slotsEnabled && settings.pickup.capacity > 0) {
      const load = (await slotLoad(draft.date)).get(draft.time) || 0;
      if (load >= settings.pickup.capacity)
        throw new HttpError(
          409,
          "Ce créneau vient d’être complété. Choisissez un autre horaire.",
        );
    }

    for (const [id, need] of needs) {
      const product = products.get(id)!;
      if (product.stock === null) continue;
      if (need > product.stock)
        throw new HttpError(
          409,
          product.stock > 0
            ? `Il ne reste que ${formatStock(product.unit, product.stock)} de « ${product.name} ». Ajustez votre panier.`
            : `« ${product.name} » vient d’être épuisé. Retirez-le de votre panier.`,
        );
      await saveProduct({ ...product, stock: product.stock - need });
    }
    for (const [id, need] of promoNeeds) {
      const promo = promotions.find((p) => p.id === id)!;
      if (promo.maxQuantity !== null && promo.sold + need > promo.maxQuantity) {
        const product = products.get(promo.productId)!;
        throw new HttpError(
          409,
          `La promotion sur « ${product.name} » est presque épuisée : il reste ${formatStock(
            product.unit,
            promo.maxQuantity - promo.sold,
          )}.`,
        );
      }
      await savePromotion({ ...promo, sold: promo.sold + need });
    }

    const { key, lines, ...rest } = draft;
    void lines;
    const order: Order = {
      ...rest,
      id: `FB-${randomBytes(4).toString("hex").toUpperCase()}`,
      token: randomBytes(24).toString("hex"),
      items,
      total: items.reduce((sum, i) => sum + i.total, 0),
      history: [{ status: "Nouvelle", at: rest.createdAt }],
    };
    await exec(
      "INSERT INTO orders VALUES (?,?,?,?)",
      order.id,
      order.token,
      key,
      JSON.stringify(order),
    );
    return { order, created: true };
  });
}

/** Remet en stock et en promotion les quantités d'une commande annulée. */
async function release(order: Order) {
  const promotions = await getPromotions();
  for (const item of order.items) {
    const need = stockNeed(item.unit, item.grams, item.quantity);
    const product = await getProduct(item.id);
    if (product && product.stock !== null)
      await saveProduct({ ...product, stock: product.stock + need });
    const promo = item.promotionId
      ? promotions.find((p) => p.id === item.promotionId)
      : undefined;
    if (promo) {
      promo.sold = Math.max(0, promo.sold - need);
      await savePromotion(promo);
    }
  }
}

export function changeStatus(
  id: string,
  status: OrderStatus,
  updatedAt: unknown,
  paidAmount?: unknown,
) {
  return transaction(async () => {
    const order = await getOrderById(id);
    if (!order) throw new HttpError(404, "Commande introuvable.");
    if (updatedAt !== order.updatedAt)
      throw new HttpError(409, "Cette commande a changé. Rechargez la page.");
    if (!transitions[order.status].includes(status))
      throw new HttpError(
        409,
        `Une commande « ${order.status} » ne peut pas passer à « ${status} ».`,
      );
    if (paidAmount !== undefined && paidAmount !== null) {
      if (
        status !== "Retirée" ||
        !Number.isInteger(paidAmount) ||
        Number(paidAmount) < 0 ||
        Number(paidAmount) > 10000000
      )
        throw new HttpError(400, "Montant encaissé invalide.");
    }
    if (status === "Annulée") await release(order);
    const at = new Date().toISOString();
    const next = normalizeOrder({
      ...order,
      status,
      updatedAt: at,
      history: [...order.history, { status, at }],
      ...(typeof paidAmount === "number" ? { paidAmount } : {}),
    });
    await saveOrder(next);
    return next;
  });
}
