import {
  categories,
  postTypes,
  units,
  type PickupSettings,
  type Post,
  type PreparationOption,
  type Product,
  type Promotion,
  type Recipe,
  type RecipeIngredient,
  type Settings,
  type Unit,
} from "../types";
import { HttpError, textField, validImage } from "./security";
import { whatsappNumber } from "../whatsapp";
import { getProduct } from "./db";

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const bool = (value: unknown, label: string) => {
  if (typeof value !== "boolean")
    throw new HttpError(400, `${label} : valeur invalide.`);
  return value;
};

function price(value: unknown, label = "Le prix") {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 100000)
    throw new HttpError(
      400,
      `${label} doit être compris entre 0,01 € et 1 000 €.`,
    );
  return Number(value);
}

function stock(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 1e7)
    throw new HttpError(400, "Stock invalide.");
  return Number(value);
}

function isoDate(value: unknown, label: string) {
  const text = textField(value, label, 40);
  const date = new Date(text);
  if (Number.isNaN(date.getTime()))
    throw new HttpError(400, `${label} : date invalide.`);
  return date.toISOString();
}

function preparations(value: unknown): PreparationOption[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8)
    throw new HttpError(400, "Options de préparation invalides.");
  return value.map((raw) => {
    const option = raw as Record<string, unknown>;
    if (!Array.isArray(option?.choices) || option.choices.length > 12)
      throw new HttpError(400, "Options de préparation invalides.");
    return {
      name: textField(option.name, "Nom de l’option", 60),
      choices: option.choices.map((c) => textField(c, "Choix", 40)),
    };
  });
}

export function validateProduct(
  body: Record<string, unknown>,
): Omit<Product, "id" | "version"> {
  const category = textField(body.category, "Catégorie", 40);
  if (!(categories as readonly string[]).includes(category))
    throw new HttpError(400, "Catégorie invalide.");
  const unit = (body.unit ?? "kg") as Unit;
  if (!units.includes(unit)) throw new HttpError(400, "Unité invalide.");
  const weights = body.weights ?? [];
  if (
    !Array.isArray(weights) ||
    weights.length > 8 ||
    weights.some((w) => !Number.isInteger(w) || w < 10 || w > 10000)
  )
    throw new HttpError(400, "Portions invalides.");
  return {
    name: textField(body.name, "Nom", 120),
    category,
    price: price(body.price, "Le prix"),
    unit,
    weights: [...new Set(weights as number[])].sort((a, b) => a - b),
    image: validImage(body.image),
    description: textField(body.description ?? "", "Description", 3000, 0),
    ingredients: textField(body.ingredients ?? "", "Composition", 2000, 0),
    origin: textField(body.origin ?? "", "Origine", 300, 0),
    allergens: textField(body.allergens ?? "", "Allergènes", 500, 0),
    cooking: textField(body.cooking ?? "", "Cuisson", 1500, 0),
    servingAdvice: textField(
      body.servingAdvice ?? "",
      "Quantités conseillées",
      500,
      0,
    ),
    preparations: preparations(body.preparations),
    badge: textField(body.badge ?? "", "Étiquette", 50, 0),
    published: bool(body.published, "Publication"),
    available: bool(body.available, "Disponibilité"),
    featured: bool(body.featured, "À la une"),
    grill: bool(body.grill, "Barbecue"),
    readyToday: bool(body.readyToday ?? false, "Prêt aujourd’hui"),
    stock: stock(body.stock),
  };
}

/** Modification rapide depuis l'iPhone : seuls les champs envoyés changent. */
export function patchProduct(
  product: Product,
  body: Record<string, unknown>,
): Product {
  const next = { ...product };
  if ("price" in body) next.price = price(body.price);
  if ("stock" in body) next.stock = stock(body.stock);
  for (const key of [
    "published",
    "available",
    "featured",
    "grill",
    "readyToday",
  ] as const)
    if (key in body) next[key] = bool(body[key], key);
  return next;
}

function time(value: unknown) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new HttpError(400, "Heure invalide (format 09:30).");
  return value;
}

function pickup(value: unknown): PickupSettings {
  const raw = (value || {}) as Record<string, unknown>;
  const int = (v: unknown, label: string, min: number, max: number) => {
    if (!Number.isInteger(v) || Number(v) < min || Number(v) > max)
      throw new HttpError(400, `${label} : valeur invalide.`);
    return Number(v);
  };
  if (!Array.isArray(raw.week) || raw.week.length !== 7)
    throw new HttpError(400, "Horaires invalides.");
  const week = raw.week.map((d) => {
    const day = d as Record<string, unknown>;
    if (!Array.isArray(day.ranges) || day.ranges.length > 4)
      throw new HttpError(400, "Horaires invalides.");
    return {
      day: int(day.day, "Jour", 0, 6),
      ranges: day.ranges.map((r) => {
        if (!Array.isArray(r) || r.length !== 2)
          throw new HttpError(400, "Plage horaire invalide.");
        const [start, end] = [time(r[0]), time(r[1])];
        if (start >= end)
          throw new HttpError(400, "Une plage horaire se termine avant de commencer.");
        return [start, end] as [string, string];
      }),
    };
  });
  if (new Set(week.map((d) => d.day)).size !== 7)
    throw new HttpError(400, "Horaires invalides.");
  if (!Array.isArray(raw.closed) || raw.closed.length > 100)
    throw new HttpError(400, "Fermetures invalides.");
  const closed = raw.closed.map((d) => {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d))
      throw new HttpError(400, "Date de fermeture invalide.");
    return d;
  });
  return {
    slotsEnabled: bool(raw.slotsEnabled, "Créneaux"),
    slotMinutes: int(raw.slotMinutes, "Durée des créneaux", 10, 240),
    capacity: int(raw.capacity, "Capacité", 0, 100),
    leadDays: int(raw.leadDays, "Délai minimum", 0, 14),
    sameDay: bool(raw.sameDay, "Jour même"),
    sameDayLeadMinutes: int(raw.sameDayLeadMinutes, "Délai jour même", 0, 600),
    maxDays: int(raw.maxDays, "Réservation maximum", 1, 90),
    week,
    closed: [...new Set(closed)].sort(),
    verified: bool(raw.verified, "Horaires vérifiés"),
  };
}

export function validateSettings(
  body: Record<string, unknown>,
): Omit<Settings, "version"> {
  const email = textField(body.email, "E-mail", 150);
  const whatsapp = textField(body.whatsapp || "", "WhatsApp", 35, 0);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "E-mail invalide.");
  if (
    whatsapp &&
    (whatsappNumber(whatsapp).length < 8 ||
      whatsappNumber(whatsapp).length > 15)
  )
    throw new HttpError(400, "Numéro WhatsApp invalide.");
  const legal = (body.legal || {}) as Record<string, unknown>;
  return {
    name: textField(body.name, "Nom de la boutique", 100),
    logo: validImage(body.logo),
    headline: textField(body.headline, "Titre", 200),
    intro: textField(body.intro, "Introduction", 700),
    hero: validImage(body.hero),
    announcement: textField(body.announcement, "Bandeau", 150),
    address: textField(body.address, "Adresse", 250),
    email,
    phone: textField(body.phone, "Téléphone", 35, 0),
    whatsapp,
    hours: textField(body.hours ?? "", "Informations complémentaires", 1000, 0),
    story: textField(body.story, "Histoire", 6000),
    storyImage: validImage(body.storyImage),
    pickup: pickup(body.pickup),
    legal: {
      company: textField(legal.company ?? "", "Raison sociale", 150, 0),
      legalForm: textField(legal.legalForm ?? "", "Forme juridique", 150, 0),
      siren: textField(legal.siren ?? "", "SIREN", 30, 0),
      director: textField(legal.director ?? "", "Responsable", 150, 0),
      host: textField(legal.host ?? "", "Hébergeur", 400, 0),
    },
  };
}

export function validatePromotion(
  body: Record<string, unknown>,
): Pick<
  Promotion,
  "productId" | "price" | "label" | "startsAt" | "endsAt" | "maxQuantity" | "active"
> {
  const productId = textField(body.productId, "Produit", 200);
  const product = getProduct(productId);
  if (!product) throw new HttpError(400, "Produit introuvable.");
  const value = price(body.price, "Le prix promotionnel");
  if (value >= product.price)
    throw new HttpError(
      400,
      "Le prix promotionnel doit être inférieur au prix habituel.",
    );
  const startsAt = isoDate(body.startsAt, "Début");
  const endsAt = isoDate(body.endsAt, "Fin");
  if (endsAt <= startsAt)
    throw new HttpError(400, "La fin doit être après le début.");
  return {
    productId,
    price: value,
    label: textField(body.label ?? "", "Titre", 80, 0),
    startsAt,
    endsAt,
    maxQuantity: stock(body.maxQuantity),
    active: bool(body.active, "Activation"),
  };
}

export function validatePost(
  body: Record<string, unknown>,
): Omit<Post, "id" | "createdAt" | "updatedAt" | "version"> {
  const type = textField(body.type, "Type", 30);
  if (!(postTypes as readonly string[]).includes(type))
    throw new HttpError(400, "Type de publication invalide.");
  const productIds = body.productIds ?? [];
  if (
    !Array.isArray(productIds) ||
    productIds.length > 12 ||
    productIds.some((id) => typeof id !== "string" || !getProduct(id))
  )
    throw new HttpError(400, "Produits associés invalides.");
  const endsAt = body.endsAt ? isoDate(body.endsAt, "Fin") : "";
  const publishAt = isoDate(body.publishAt, "Date de publication");
  if (endsAt && endsAt <= publishAt)
    throw new HttpError(400, "La fin doit être après la publication.");
  return {
    type: type as Post["type"],
    title: textField(body.title, "Titre", 120),
    body: textField(body.body ?? "", "Texte", 4000, 0),
    image: body.image ? validImage(body.image) : "",
    productIds: productIds as string[],
    publishAt,
    endsAt,
    featured: bool(body.featured, "À la une"),
    draft: bool(body.draft, "Brouillon"),
  };
}

export function validateRecipe(
  body: Record<string, unknown>,
): Omit<Recipe, "id" | "createdAt" | "version"> {
  const int = (v: unknown, label: string, min: number, max: number) => {
    if (!Number.isInteger(v) || Number(v) < min || Number(v) > max)
      throw new HttpError(400, `${label} : valeur invalide.`);
    return Number(v);
  };
  if (!Array.isArray(body.ingredients) || body.ingredients.length > 40)
    throw new HttpError(400, "Ingrédients invalides.");
  if (!Array.isArray(body.steps) || body.steps.length > 30)
    throw new HttpError(400, "Étapes invalides.");
  const ingredients: RecipeIngredient[] = body.ingredients.map((raw) => {
    const i = raw as Record<string, unknown>;
    const quantity =
      i.quantity === null || i.quantity === "" || i.quantity === undefined
        ? null
        : Number(i.quantity);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))
      throw new HttpError(400, "Quantité d’ingrédient invalide.");
    const productId = textField(i.productId ?? "", "Produit", 200, 0);
    if (productId && !getProduct(productId))
      throw new HttpError(400, "Produit associé introuvable.");
    return {
      quantity,
      unit: textField(i.unit ?? "", "Unité", 20, 0),
      name: textField(i.name, "Ingrédient", 120),
      productId,
    };
  });
  const productIds = body.productIds ?? [];
  if (
    !Array.isArray(productIds) ||
    productIds.some((id) => typeof id !== "string" || !getProduct(id))
  )
    throw new HttpError(400, "Produits associés invalides.");
  return {
    title: textField(body.title, "Titre", 120),
    intro: textField(body.intro ?? "", "Introduction", 600, 0),
    image: body.image ? validImage(body.image) : "",
    servings: int(body.servings, "Personnes", 1, 30),
    prepMinutes: int(body.prepMinutes, "Préparation", 0, 1440),
    cookMinutes: int(body.cookMinutes, "Cuisson", 0, 2880),
    ingredients,
    steps: body.steps.map((s) => textField(s, "Étape", 1500)),
    tip: textField(body.tip ?? "", "Conseil", 600, 0),
    productIds: productIds as string[],
    published: bool(body.published, "Publication"),
  };
}
