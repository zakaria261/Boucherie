// Modèle de données partagé entre le site public, l'application du boucher et
// les API. Les objets sont stockés en JSON dans SQLite : tout nouveau champ doit
// avoir une valeur par défaut dans lib/server/normalize.ts pour que les données
// déjà enregistrées restent lisibles.

/** Unités de vente. Le prix est exprimé pour cette unité. */
export const units = ["kg", "100g", "piece", "lot"] as const;
export type Unit = (typeof units)[number];
export const unitLabels: Record<Unit, string> = {
  kg: "le kg",
  "100g": "les 100 g",
  piece: "la pièce",
  lot: "le lot",
};
export const unitShort: Record<Unit, string> = {
  kg: "/ kg",
  "100g": "/ 100 g",
  piece: "/ pièce",
  lot: "/ lot",
};

/**
 * Catégories. Les quatre premières portent le catalogue d'origine ; les
 * suivantes n'apparaissent sur le site que lorsqu'un produit publié y est rangé.
 */
export const categories = [
  "Bœuf",
  "Volailles",
  "Veau",
  "Agneau",
  "Charcuterie",
  "Traiteur",
  "Préparations maison",
  "Lots",
  "Saisonnier",
] as const;

export type PreparationOption = {
  /** Ex. « Épaisseur ». */
  name: string;
  /** Ex. ["1 cm", "2 cm"]. Vide : simple case à cocher (ex. « Sous-vide »). */
  choices: string[];
};

export type Product = {
  id: string;
  name: string;
  /** Prix en centimes pour l'unité de vente. */
  price: number;
  unit: Unit;
  /** Portions proposées en grammes (unités kg et 100g uniquement). */
  weights: number[];
  category: string;
  image: string;
  grill: boolean;
  description: string;
  /** Champ historique : ingrédients, composition. */
  ingredients: string;
  origin: string;
  allergens: string;
  cooking: string;
  servingAdvice: string;
  preparations: PreparationOption[];
  badge: string;
  published: boolean;
  available: boolean;
  featured: boolean;
  /** Prêt à être retiré le jour même (rubrique « Disponible aujourd'hui »). */
  readyToday: boolean;
  /**
   * Stock suivi : grammes pour les unités au poids, nombre pour pièce et lot.
   * null : pas de suivi précis, seul « disponible » compte.
   */
  stock: number | null;
  version: number;
};

/** Produit tel qu'envoyé au navigateur, avec la promotion en cours. */
export type PublicProduct = Product & {
  promo: {
    id: string;
    price: number;
    endsAt: string;
    /** Quantité restante, dans l'unité du stock. null si non limitée. */
    remaining: number | null;
    label: string;
  } | null;
};

export type DaySchedule = {
  /** 0 = dimanche … 6 = samedi */
  day: number;
  /** Plages d'ouverture ["09:00", "13:00"]. Vide : fermé. */
  ranges: [string, string][];
};

export type PickupSettings = {
  /** Créneaux horaires proposés aux clients. false : date seule. */
  slotsEnabled: boolean;
  /** Durée d'un créneau en minutes. */
  slotMinutes: number;
  /** Nombre maximum de commandes par créneau. 0 : illimité. */
  capacity: number;
  /** Délai minimum en jours pour une commande classique (1 = lendemain). */
  leadDays: number;
  /** Autoriser le retrait le jour même pour les produits « prêts aujourd'hui ». */
  sameDay: boolean;
  /** Délai de préparation minimum en minutes pour le jour même. */
  sameDayLeadMinutes: number;
  /** Nombre de jours ouverts à la réservation. */
  maxDays: number;
  week: DaySchedule[];
  /** Dates fermées exceptionnellement (AAAA-MM-JJ). */
  closed: string[];
  /** Horaires confirmés par le propriétaire depuis l'application. */
  verified: boolean;
};

export type LegalSettings = {
  company: string;
  legalForm: string;
  siren: string;
  director: string;
  host: string;
};

export type Settings = {
  name: string;
  logo: string;
  headline: string;
  intro: string;
  hero: string;
  announcement: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  hours: string;
  story: string;
  storyImage: string;
  pickup: PickupSettings;
  legal: LegalSettings;
  version: number;
};

export const statuses = [
  "Nouvelle",
  "Confirmée",
  "En préparation",
  "Prête",
  "Retirée",
  "Annulée",
] as const;
export type OrderStatus = (typeof statuses)[number];

/**
 * Transitions autorisées. Un retour d'une étape est permis pour corriger une
 * erreur de manipulation ; une commande retirée ou annulée est terminée.
 */
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  Nouvelle: ["Confirmée", "Annulée"],
  Confirmée: ["En préparation", "Prête", "Nouvelle", "Annulée"],
  "En préparation": ["Prête", "Confirmée", "Annulée"],
  Prête: ["Retirée", "En préparation", "Annulée"],
  Retirée: [],
  Annulée: [],
};

export type OrderItem = {
  id: string;
  name: string;
  unit: Unit;
  /** Portion en grammes pour les unités au poids, 0 sinon. */
  grams: number;
  quantity: number;
  /** Prix unitaire appliqué (promotion comprise), en centimes. */
  price: number;
  /** Prix habituel lorsqu'une promotion s'applique. */
  regularPrice?: number;
  promotionId?: string;
  total: number;
  options: string[];
};

export type OrderEvent = { status: OrderStatus; at: string };

export type Order = {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  name: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  date: string;
  /** Heure de retrait « HH:MM ». Vide : à convenir avec la boucherie. */
  time: string;
  notes: string;
  items: OrderItem[];
  total: number;
  history: OrderEvent[];
  /** Montant réellement encaissé en boutique (centimes), saisi au retrait. */
  paidAmount?: number;
  whatsappNotifications?: {
    owner: "sent" | "not-configured" | "failed";
    customer: "sent" | "not-configured" | "not-requested" | "failed";
    status?: "sent" | "not-configured" | "not-requested" | "failed";
  };
  push?: "sent" | "not-configured" | "failed";
};

export const postTypes = [
  "Actualité",
  "Arrivage",
  "Événement",
  "Horaires",
  "Campagne",
] as const;
export type PostType = (typeof postTypes)[number];

export type Post = {
  id: string;
  type: PostType;
  title: string;
  body: string;
  image: string;
  productIds: string[];
  /** Date de mise en ligne (ISO). Dans le futur : publication programmée. */
  publishAt: string;
  /** Date de retrait automatique (ISO), facultative. */
  endsAt: string;
  featured: boolean;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Promotion = {
  id: string;
  productId: string;
  /** Prix promotionnel en centimes, dans l'unité du produit. */
  price: number;
  label: string;
  startsAt: string;
  endsAt: string;
  /** Quantité maximale (unité du stock). null : pas de limite. */
  maxQuantity: number | null;
  /** Quantité déjà réservée par des commandes. */
  sold: number;
  active: boolean;
  createdAt: string;
  version: number;
};

export type RecipeIngredient = {
  /** Quantité pour le nombre de personnes de base. null : « selon le goût ». */
  quantity: number | null;
  unit: string;
  name: string;
  productId: string;
};

export type Recipe = {
  id: string;
  title: string;
  intro: string;
  image: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tip: string;
  productIds: string[];
  published: boolean;
  createdAt: string;
  version: number;
};
