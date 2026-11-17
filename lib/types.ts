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
  social: SocialLinks;
  loyalty: LoyaltySettings;
  version: number;
};

/**
 * Cycle d'une commande, quelle que soit son origine. Une demande (liste de
 * courses, demande professionnelle, commande du site) est « reçue » tant que
 * la boucherie ne l'a pas acceptée : réception ≠ acceptation.
 */
export const statuses = [
  "Demande reçue",
  "En attente de validation",
  "Acceptée",
  "En préparation",
  "Prête",
  "Retirée",
  "Annulée",
] as const;
export type OrderStatus = (typeof statuses)[number];
/** Anciens libellés, convertis à la lecture. */
export const legacyStatuses: Record<string, OrderStatus> = {
  Nouvelle: "Demande reçue",
  Confirmée: "Acceptée",
};

/**
 * Transitions autorisées (contrôlées côté serveur). Un retour d'une étape est
 * permis pour corriger une erreur ; une commande retirée ou annulée est close.
 */
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  "Demande reçue": ["En attente de validation", "Acceptée", "Annulée"],
  "En attente de validation": ["Acceptée", "Demande reçue", "Annulée"],
  Acceptée: ["En préparation", "Prête", "En attente de validation", "Annulée"],
  "En préparation": ["Prête", "Acceptée", "Annulée"],
  Prête: ["Retirée", "En préparation", "Annulée"],
  Retirée: [],
  Annulée: [],
};
/** Statuts où la commande est à préparer (après acceptation). */
export const preparing: OrderStatus[] = ["Acceptée", "En préparation", "Prête"];

export const origins = {
  catalogue: "Catalogue web",
  liste: "Liste de courses",
  pro: "Demande professionnelle",
  telephone: "Téléphone",
  manuel: "Saisie manuelle",
  photo: "Import photo",
  whatsapp: "WhatsApp",
  devis: "Devis accepté",
  lot: "Lot",
} as const;
export type OrderOrigin = keyof typeof origins;

/** Unités d'un article libre (liste de courses, demande professionnelle). */
export const freeUnits = { g: "g", kg: "kg", piece: "pièce(s)" } as const;
export type FreeUnit = keyof typeof freeUnits;

/** Suivi de préparation d'une ligne (côté boucher uniquement). */
export type PrepState = {
  prepared?: boolean;
  preparedAt?: string;
  /** Poids réellement préparé, en grammes. */
  preparedWeight?: number | null;
  substitution?: string;
  /** Prix final de la ligne en centimes, une fois connu. */
  finalPrice?: number | null;
};

/** Ligne issue du catalogue : prix connu et vérifié par le serveur. */
export type CatalogItem = PrepState & {
  kind?: "catalogue";
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

/**
 * Article saisi librement : aucun prix n'est déduit de sa désignation.
 * price/total null = montant à confirmer par la boucherie (jamais 0).
 */
export type FreeItem = PrepState & {
  kind: "libre";
  name: string;
  /** Quantité totale, strictement positive. */
  quantity: number;
  unit: FreeUnit;
  note: string;
  /** Professionnels : découpe, poids cible par pièce, conditionnement. */
  cut?: string;
  portionGrams?: number | null;
  packaging?: string;
  price: number | null;
  total: number | null;
};

export type OrderItem = CatalogItem | FreeItem;
export const isFree = (item: OrderItem): item is FreeItem => item.kind === "libre";

export type OrderEvent = { status: OrderStatus; at: string; by?: string };

/** Note interne : jamais visible par le client. */
export type InternalNote = { id: string; at: string; by: string; text: string };

export const proActivities = [
  "Restaurant",
  "Traiteur",
  "Commerce",
  "Association",
  "Autre",
] as const;
export type ProActivity = (typeof proActivities)[number];
export const recurrences = {
  ponctuel: "Besoin ponctuel",
  quotidienne: "Quotidien",
  hebdomadaire: "Hebdomadaire",
  mensuelle: "Mensuel",
  autre: "Autre fréquence",
} as const;
export type Recurrence = keyof typeof recurrences;

/** Informations transmises par un professionnel avec sa demande. */
export type ProDetails = {
  requestType: "devis" | "commande";
  contactName: string;
  company: string;
  country: string;
  siret: string;
  foreignId: string;
  noSiret: boolean;
  noSiretReason: string;
  activity: ProActivity;
  activityOther: string;
  phone: string;
  email: string;
  billingAddress: string;
  vatNumber: string;
  poReference: string;
  /** Créneau impératif ou flexible. */
  slotMode: "impératif" | "flexible";
  pickupContact: string;
  eventDate: string;
  covers: number | null;
  recurrence: Recurrence;
  recurrenceDetail: string;
  contactPreference: "téléphone" | "e-mail" | "indifférent";
};

export type Order = {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  origin: OrderOrigin;
  customerType: "particulier" | "pro";
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  date: string;
  /** Heure de retrait « HH:MM ». Vide : à convenir avec la boucherie. */
  time: string;
  notes: string;
  items: OrderItem[];
  /** Total estimé en centimes ; null tant qu'un article n'a pas de prix. */
  total: number | null;
  history: OrderEvent[];
  /** Montant réellement encaissé en boutique (centimes), saisi au retrait. */
  paidAmount?: number;
  companyId?: string;
  pro?: ProDetails;
  quoteId?: string;
  /** Photo d'origine (import photo), stockée de façon privée. */
  mediaId?: string;
  internalNotes?: InternalNote[];
  whatsappNotifications?: {
    owner: "sent" | "not-configured" | "failed";
    customer: "sent" | "not-configured" | "not-requested" | "failed";
    status?: "sent" | "not-configured" | "not-requested" | "failed";
  };
  push?: "sent" | "not-configured" | "failed";
};

/** Cycle d'un devis, distinct de celui des commandes. */
export const quoteStatuses = [
  "Demande reçue",
  "En étude",
  "Devis établi",
  "Envoyé",
  "Accepté",
  "Refusé",
  "Expiré",
  "Converti en commande",
] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];
export const quoteTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  "Demande reçue": ["En étude", "Refusé"],
  "En étude": ["Devis établi", "Demande reçue", "Refusé"],
  "Devis établi": ["Envoyé", "En étude", "Accepté", "Refusé"],
  Envoyé: ["Accepté", "Refusé", "Expiré", "Devis établi"],
  Accepté: ["Converti en commande"],
  Refusé: ["En étude"],
  Expiré: ["En étude"],
  "Converti en commande": [],
};

export type QuoteLine = {
  designation: string;
  /** Quantité (décimales autorisées : 2,5 kg). */
  quantity: number;
  unit: string;
  /** Prix unitaire hors taxes, en centimes. */
  unitPrice: number;
  /** Taux de TVA en points de base (550 = 5,5 %). */
  vatRate: number;
};

export type Quote = {
  id: string;
  /** Lien privé du client (consultation, PDF). */
  token: string;
  /** Numéro officiel, attribué à l'établissement du devis. */
  number: string | null;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  source: "pro" | "manuel";
  companyId: string | null;
  customer: { name: string; company: string; phone: string; email: string; address: string };
  /** Demande d'origine du client, conservée telle quelle. */
  request: {
    items: FreeItem[];
    instructions: string;
    date: string;
    time: string;
    pro?: ProDetails;
  } | null;
  lines: QuoteLine[];
  /** Date de validité (AAAA-MM-JJ). */
  validUntil: string;
  conditions: string;
  /** Message visible par le client sur le devis. */
  message: string;
  orderId: string | null;
  history: { status: QuoteStatus; at: string; by?: string }[];
  internalNotes: InternalNote[];
};

/** Fiche d'un client professionnel. */
export type Company = {
  id: string;
  name: string;
  country: string;
  siret: string;
  foreignId: string;
  noSiretReason: string;
  activity: ProActivity;
  vatNumber: string;
  billingAddress: string;
  contacts: { name: string; phone: string; email: string }[];
  status: "À vérifier" | "Vérifiée";
  /** Conditions commerciales convenues (interne). */
  conditions: string;
  internalNotes: InternalNote[];
  /** Lien privé de l'espace professionnel. */
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/** Programme de fidélité : désactivé tant que les règles ne sont pas validées. */
export type LoyaltySettings = {
  enabled: boolean;
  /** Points gagnés par euro réellement payé au retrait. */
  pointsPerEuro: number;
  /** Seuil de points donnant droit à la récompense. */
  threshold: number;
  reward: string;
  /** Mois sans achat après lesquels le solde expire (0 : jamais). */
  validityMonths: number;
  exclusions: string;
  /** Date de validation des règles par le propriétaire. */
  approvedAt: string;
};

export type LoyaltyTransaction = {
  id: string;
  at: string;
  type: "gain" | "utilisation" | "ajustement";
  points: number;
  orderId?: string;
  reason: string;
  by: string;
};
export type LoyaltyAccount = {
  phone: string;
  name: string;
  transactions: LoyaltyTransaction[];
  lastPurchaseAt: string;
};

export type SocialLinks = { instagram: string; facebook: string; tiktok: string };

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
