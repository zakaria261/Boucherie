// Complète les objets enregistrés avant l'ajout de nouveaux champs. Les données
// existantes ne sont jamais réécrites ici : la valeur par défaut est appliquée à
// la lecture, puis enregistrée lors de la prochaine modification.
import type {
  Company,
  LoyaltySettings,
  Order,
  OrderStatus,
  PickupSettings,
  Product,
  Quote,
  Settings,
  Unit,
} from "../types";
import { legacyStatuses, statuses, units } from "../types";

export const defaultPickup: PickupSettings = {
  slotsEnabled: true,
  slotMinutes: 30,
  capacity: 4,
  leadDays: 1,
  sameDay: true,
  sameDayLeadMinutes: 60,
  maxDays: 21,
  // Horaires publiés sur l'ancien site de la boucherie, à vérifier par le
  // propriétaire dans Plus → Retraits (verified: false).
  week: [
    { day: 1, ranges: [["09:00", "13:00"], ["15:00", "19:00"]] },
    { day: 2, ranges: [["09:00", "13:00"], ["15:00", "19:00"]] },
    { day: 3, ranges: [["09:00", "13:00"], ["15:00", "19:00"]] },
    { day: 4, ranges: [["09:00", "13:00"], ["15:00", "19:00"]] },
    { day: 5, ranges: [["09:00", "13:00"], ["15:00", "19:00"]] },
    { day: 6, ranges: [["09:00", "19:00"]] },
    { day: 0, ranges: [["09:00", "13:00"]] },
  ],
  closed: [],
  verified: false,
};

export const defaultLegal = {
  company: "Boucherie du Faubourg",
  legalForm: "",
  siren: "751 872 524",
  director: "",
  host: "",
};

/** Programme de fidélité désactivé : aucune règle n'est supposée. */
export const defaultLoyalty: LoyaltySettings = {
  enabled: false,
  pointsPerEuro: 0,
  threshold: 0,
  reward: "",
  validityMonths: 0,
  exclusions: "",
  approvedAt: "",
};

export function normalizeProduct(raw: Partial<Product>): Product {
  const unit: Unit = units.includes(raw.unit as Unit)
    ? (raw.unit as Unit)
    : "kg";
  return {
    id: raw.id || "",
    name: raw.name || "",
    price: raw.price || 0,
    unit,
    weights: Array.isArray(raw.weights) ? raw.weights : [],
    category: raw.category || "Bœuf",
    image: raw.image || "",
    grill: !!raw.grill,
    description: raw.description || "",
    ingredients: raw.ingredients || "",
    origin: raw.origin || "",
    allergens: raw.allergens || "",
    cooking: raw.cooking || "",
    servingAdvice: raw.servingAdvice || "",
    preparations: Array.isArray(raw.preparations) ? raw.preparations : [],
    badge: raw.badge || "",
    published: raw.published ?? true,
    available: raw.available ?? true,
    featured: !!raw.featured,
    readyToday: !!raw.readyToday,
    stock:
      typeof raw.stock === "number" && Number.isFinite(raw.stock)
        ? raw.stock
        : null,
    version: raw.version || 1,
  };
}

export function normalizeSettings(raw: Partial<Settings>): Settings {
  const pickup = { ...defaultPickup, ...(raw.pickup || {}) };
  return {
    name: raw.name || "Boucherie du Faubourg",
    logo: raw.logo || "/images/logo-original.png",
    headline: raw.headline || "",
    intro: raw.intro || "",
    hero: raw.hero || "/images/hero.jpg",
    announcement: raw.announcement || "",
    address: raw.address || "6 rue d’Abbeville, 80000 Amiens",
    email: raw.email || "",
    phone: raw.phone || "",
    whatsapp: raw.whatsapp || "",
    hours: raw.hours || "",
    story: raw.story || "",
    storyImage: raw.storyImage || "/images/artisan.jpg",
    pickup,
    legal: { ...defaultLegal, ...(raw.legal || {}) },
    social: { instagram: "", facebook: "", tiktok: "", ...(raw.social || {}) },
    loyalty: { ...defaultLoyalty, ...(raw.loyalty || {}) },
    version: raw.version || 1,
  };
}

const status = (value: string): OrderStatus =>
  (statuses as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : legacyStatuses[value] || "Demande reçue";

export function normalizeOrder(raw: Order): Order {
  return {
    ...raw,
    status: status(raw.status),
    origin: raw.origin || "catalogue",
    customerType: raw.customerType || "particulier",
    time: raw.time || "",
    notes: raw.notes || "",
    history: raw.history?.length
      ? raw.history.map((h) => ({ ...h, status: status(h.status) }))
      : [{ status: "Demande reçue", at: raw.createdAt }],
    items: raw.items.map((item) =>
      item.kind === "libre"
        ? item
        : { ...item, unit: item.unit || "kg", options: item.options || [] },
    ),
    total: raw.total ?? null,
    internalNotes: raw.internalNotes || [],
  };
}

export function normalizeQuote(raw: Quote): Quote {
  return {
    ...raw,
    lines: raw.lines || [],
    history: raw.history || [],
    internalNotes: raw.internalNotes || [],
    conditions: raw.conditions || "",
    message: raw.message || "",
    validUntil: raw.validUntil || "",
  };
}

export function normalizeCompany(raw: Company): Company {
  return {
    ...raw,
    contacts: raw.contacts || [],
    internalNotes: raw.internalNotes || [],
    conditions: raw.conditions || "",
    status: raw.status || "À vérifier",
  };
}
