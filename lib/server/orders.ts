import { randomBytes } from "node:crypto";
import {
  audit,
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
  parisNow,
  stockNeed,
  weightsFor,
} from "../shop";
import {
  isFree,
  preparing,
  transitions,
  type CatalogItem,
  type FreeItem,
  type InternalNote,
  type Order,
  type OrderItem,
  type OrderOrigin,
  type OrderStatus,
  type ProDetails,
  type Product,
  type Promotion,
} from "../types";
import { orderTotal } from "../requests";
import { creditOrder } from "./loyalty";

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
    status: "Demande reçue",
    origin: "catalogue",
    customerType: "particulier",
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

type CatalogLine = {
  product: string;
  grams: number;
  quantity: number;
  /** Prix vu par le client ; vérifié pour les commandes du site uniquement. */
  price?: number;
  options: unknown;
};

/**
 * Calcule les lignes catalogue au prix du serveur (promotion comprise) et
 * réserve stock et quantités promotionnelles. À appeler dans une transaction.
 */
async function priceAndReserve(lines: CatalogLine[], now: Date, checkClientPrice: boolean) {
  const promotions = (await getPromotions()).filter((p) => promotionLive(p, now));
  const products = new Map<string, Product>();
  const needs = new Map<string, number>();
  const promoNeeds = new Map<string, number>();
  const seen = new Set<string>();
  const items: CatalogItem[] = [];
  for (const line of lines) {
    const product = products.get(line.product) || (await getProduct(line.product));
    if (!product?.published || !product.available)
      throw new HttpError(409, "Un produit n’est plus disponible. Actualisez votre panier.");
    products.set(product.id, product);
    if (!weightsFor(product).includes(line.grams))
      throw new HttpError(400, "Quantité invalide.");
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY)
      throw new HttpError(400, "Quantité invalide.");
    const options = validOptions(product, line.options);
    const unique = cartKey({ id: product.id, grams: line.grams, quantity: 1, options });
    if (seen.has(unique)) throw new HttpError(400, "Article en double.");
    seen.add(unique);
    const promo = promotions
      .filter((p) => p.productId === product.id && p.price < product.price)
      .sort((a, b) => a.price - b.price)[0];
    const unitPrice = promo ? promo.price : product.price;
    if (checkClientPrice && line.price !== unitPrice)
      throw new HttpError(409, "Un tarif a changé. Actualisez la page pour vérifier le nouveau total.");
    const need = stockNeed(product.unit, line.grams, line.quantity);
    needs.set(product.id, (needs.get(product.id) || 0) + need);
    if (promo) promoNeeds.set(promo.id, (promoNeeds.get(promo.id) || 0) + need);
    items.push({
      id: product.id,
      name: product.name,
      unit: product.unit,
      grams: line.grams,
      quantity: line.quantity,
      price: unitPrice,
      ...(promo ? { regularPrice: product.price, promotionId: promo.id } : {}),
      total: linePrice(unitPrice, line.grams, line.quantity, product.unit),
      options,
    });
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
    const promo = promotions.find((p: Promotion) => p.id === id)!;
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
  return { items, sameDay: [...products.values()].every((p) => p.readyToday) };
}

/** Vérifie la capacité du créneau (commandes non annulées), dans la transaction. */
async function checkCapacity(date: string, time: string) {
  const { pickup } = await getSettings();
  if (!pickup.slotsEnabled || pickup.capacity <= 0 || !time) return;
  const load = (await slotLoad(date)).get(time) || 0;
  if (load >= pickup.capacity)
    throw new HttpError(409, "Ce créneau vient d’être complété. Choisissez un autre horaire.");
}

const prefixes: Record<OrderOrigin, string> = {
  catalogue: "FB",
  liste: "LC",
  pro: "PR",
  telephone: "FB",
  manuel: "FB",
  photo: "FB",
  whatsapp: "FB",
  devis: "FB",
  lot: "LT",
};
export const newOrderId = (origin: OrderOrigin) =>
  `${prefixes[origin]}-${randomBytes(4).toString("hex").toUpperCase()}`;

async function insertOrder(order: Order, key: string) {
  await exec(
    "INSERT INTO orders VALUES (?,?,?,?)",
    order.id,
    order.token,
    key,
    JSON.stringify(order),
  );
}

async function priorOrder(key: string) {
  const prior = await one<{ data: string }>("SELECT data FROM orders WHERE request_key = ?", key);
  return prior ? normalizeOrder(JSON.parse(prior.data) as Order) : null;
}

/**
 * Enregistre une commande du site. Tout se passe dans une transaction
 * exclusive : prix, disponibilité, stock, quantités promotionnelles et
 * capacité du créneau sont vérifiés et réservés ensemble, sans double vente
 * possible. Un même requestKey renvoie toujours la même commande.
 */
export function createOrder(draft: Draft, now = new Date()) {
  return transaction(async () => {
    const prior = await priorOrder(draft.key);
    if (prior) return { order: prior, created: false };
    const settings = await getSettings();
    const { items, sameDay } = await priceAndReserve(draft.lines, now, true);
    const problem = pickupError(settings.pickup, draft.date, draft.time, sameDay, now);
    if (problem) throw new HttpError(400, problem);
    await checkCapacity(draft.date, draft.time);
    const { key, lines, ...rest } = draft;
    void lines;
    const order: Order = {
      ...rest,
      id: newOrderId("catalogue"),
      token: randomBytes(24).toString("hex"),
      items,
      total: items.reduce((sum, i) => sum + i.total, 0),
      history: [{ status: "Demande reçue", at: rest.createdAt }],
    };
    await insertOrder(order, key);
    return { order, created: true };
  });
}

export type RequestDraft = {
  key: string;
  origin: "liste" | "pro" | "lot";
  /** Jours de retrait autorisés (lots du week-end) ; vide : tous. */
  days?: number[];
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  notes: string;
  items: FreeItem[];
  pro?: ProDetails;
  companyId?: string;
};

/**
 * Enregistre une demande libre (liste de courses, demande de commande
 * professionnelle) : aucun prix n'est attribué, la boucherie confirmera.
 * Les règles de retrait sont celles du site (jours, horaires, délai,
 * fermetures, capacité), contrôlées ici au moment de l'enregistrement.
 */
export function createRequestOrder(draft: RequestDraft, now = new Date()) {
  return transaction(async () => {
    const prior = await priorOrder(draft.key);
    if (prior) return { order: prior, created: false };
    const settings = await getSettings();
    const problem = pickupError(settings.pickup, draft.date, draft.time, false, now);
    if (problem) throw new HttpError(400, problem);
    if (draft.days?.length && !draft.days.includes(new Date(`${draft.date}T12:00:00Z`).getUTCDay()))
      throw new HttpError(400, "Ce lot n’est disponible que certains jours : choisissez une autre date.");
    await checkCapacity(draft.date, draft.time);
    const at = now.toISOString();
    const order: Order = {
      id: newOrderId(draft.origin),
      token: randomBytes(24).toString("hex"),
      createdAt: at,
      updatedAt: at,
      status: "Demande reçue",
      origin: draft.origin,
      customerType: draft.origin === "pro" ? "pro" : "particulier",
      name: `${draft.firstName} ${draft.lastName}`.trim(),
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      whatsappOptIn: false,
      date: draft.date,
      time: draft.time,
      notes: draft.notes,
      items: draft.items,
      // Liste et demande PRO : prix à confirmer (null). Lot : prix connu.
      total: orderTotal(draft.items),
      history: [{ status: "Demande reçue", at }],
      ...(draft.pro ? { pro: draft.pro } : {}),
      ...(draft.companyId ? { companyId: draft.companyId } : {}),
      internalNotes: [],
    };
    await insertOrder(order, draft.key);
    return { order, created: true };
  });
}

export type ManualDraft = {
  key: string;
  origin: "telephone" | "manuel" | "photo" | "whatsapp";
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  notes: string;
  catalog: CatalogLine[];
  free: FreeItem[];
  mediaId?: string;
};

/**
 * Commande saisie par l'équipe (téléphone, comptoir, WhatsApp, photo) :
 * déjà convenue avec le client, elle entre directement « Acceptée ». Les
 * lignes catalogue sont tarifées par le serveur et réservent le stock.
 */
export function createManualOrder(draft: ManualDraft, by: string, now = new Date()) {
  return transaction(async () => {
    const prior = await priorOrder(draft.key);
    if (prior) return { order: prior, created: false };
    if (!draft.catalog.length && !draft.free.length)
      throw new HttpError(400, "Ajoutez au moins un article.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date < parisNow(now).date)
      throw new HttpError(400, "La date de retrait ne peut pas être passée.");
    if (draft.time && !/^\d{2}:\d{2}$/.test(draft.time))
      throw new HttpError(400, "Heure de retrait invalide.");
    const { items: catalogItems } = draft.catalog.length
      ? await priceAndReserve(draft.catalog, now, false)
      : { items: [] as CatalogItem[] };
    const items: OrderItem[] = [...catalogItems, ...draft.free];
    const at = now.toISOString();
    const order: Order = {
      id: newOrderId(draft.origin),
      token: randomBytes(24).toString("hex"),
      createdAt: at,
      updatedAt: at,
      status: "Acceptée",
      origin: draft.origin,
      customerType: "particulier",
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      whatsappOptIn: false,
      date: draft.date,
      time: draft.time,
      notes: draft.notes,
      items,
      total: orderTotal(items),
      history: [
        { status: "Demande reçue", at, by },
        { status: "Acceptée", at, by },
      ],
      ...(draft.mediaId ? { mediaId: draft.mediaId } : {}),
      internalNotes: [],
    };
    await insertOrder(order, draft.key);
    await audit(by, "commande.saisie", "order", order.id, { origin: draft.origin });
    return { order, created: true };
  });
}

/** Insère une commande déjà construite (conversion d'un devis accepté). */
export async function insertPreparedOrder(order: Order, key: string) {
  await insertOrder(order, key);
}

/** Remet en stock et en promotion les quantités d'une commande annulée. */
async function release(order: Order) {
  const promotions = await getPromotions();
  for (const item of order.items) {
    if (isFree(item)) continue;
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
  by = "",
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
      history: [...order.history, { status, at, ...(by ? { by } : {}) }],
      ...(typeof paidAmount === "number" ? { paidAmount } : {}),
    });
    await saveOrder(next);
    await audit(by || "?", "commande.statut", "order", id, { from: order.status, to: status });
    // Fidélité : uniquement sur le montant réellement encaissé au retrait.
    if (status === "Retirée") await creditOrder(next, next.paidAmount, by || "?");
    return next;
  });
}

export type PrepPatch = {
  prepared?: boolean;
  preparedWeight?: number | null;
  substitution?: string;
  finalPrice?: number | null;
};

/** Valide une modification de préparation reçue du navigateur. */
export function parsePrepPatch(body: Record<string, unknown>): PrepPatch {
  const patch: PrepPatch = {};
  if (body.prepared !== undefined) {
    if (typeof body.prepared !== "boolean") throw new HttpError(400, "Valeur invalide.");
    patch.prepared = body.prepared;
  }
  const cents = (v: unknown, label: string) => {
    if (v === null || v === "") return null;
    if (!Number.isInteger(v) || Number(v) < 0 || Number(v) > 100_000_000)
      throw new HttpError(400, `${label} invalide.`);
    return Number(v);
  };
  if (body.preparedWeight !== undefined) patch.preparedWeight = cents(body.preparedWeight, "Poids");
  if (body.finalPrice !== undefined) patch.finalPrice = cents(body.finalPrice, "Prix");
  if (body.substitution !== undefined) patch.substitution = textField(body.substitution, "Remplacement", 200, 0);
  if (!Object.keys(patch).length) throw new HttpError(400, "Aucune modification.");
  return patch;
}

/**
 * Coche une ligne ou renseigne poids, remplacement et prix final. Écrit dans
 * la transaction exclusive : deux collaborateurs qui cochent en même temps
 * ne s'écrasent pas. Ne change jamais le statut de la commande.
 */
export function updatePrep(id: string, index: number, name: unknown, patch: PrepPatch, by: string) {
  return transaction(async () => {
    const order = await getOrderById(id);
    if (!order) throw new HttpError(404, "Commande introuvable.");
    if (!preparing.includes(order.status))
      throw new HttpError(409, "Acceptez la commande avant de la préparer.");
    const item = order.items[index];
    if (!item || item.name !== name)
      throw new HttpError(409, "Cette commande a changé. Rechargez la page.");
    const nextItem: OrderItem = { ...item, ...patch };
    if (patch.prepared !== undefined)
      nextItem.preparedAt = patch.prepared ? new Date().toISOString() : undefined;
    const items = order.items.map((x, i) => (i === index ? nextItem : x));
    const next: Order = { ...order, items };
    await saveOrder(next);
    await audit(by, "commande.preparation", "order", id, { ligne: item.name, ...patch });
    return next;
  });
}

/** Ajoute une note interne (jamais visible par le client). */
export function addOrderNote(id: string, text: string, by: string) {
  return transaction(async () => {
    const order = await getOrderById(id);
    if (!order) throw new HttpError(404, "Commande introuvable.");
    const note: InternalNote = {
      id: randomBytes(6).toString("hex"),
      at: new Date().toISOString(),
      by,
      text,
    };
    const next: Order = { ...order, internalNotes: [...(order.internalNotes || []), note] };
    await saveOrder(next);
    await audit(by, "commande.note", "order", id);
    return next;
  });
}

/** Vue client d'une commande : sans notes internes ni suivi de préparation. */
export function publicOrder(order: Order) {
  return {
    id: order.id,
    status: order.status,
    origin: order.origin,
    customerType: order.customerType,
    date: order.date,
    time: order.time,
    total: order.total,
    createdAt: order.createdAt,
    notes: order.notes,
    items: order.items.map((item) => {
      const { prepared, preparedAt, preparedWeight, substitution, finalPrice, ...rest } = item;
      void prepared, preparedAt, preparedWeight, substitution, finalPrice;
      return rest;
    }),
  };
}
export type PublicOrder = ReturnType<typeof publicOrder>;
