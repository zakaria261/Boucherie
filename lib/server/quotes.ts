// Devis : cycle distinct des commandes. Une demande de devis n'est pas un
// devis ; elle le devient quand la boucherie établit les lignes et les prix,
// ce qui lui attribue un numéro officiel. Un devis accepté peut être converti
// une seule fois en commande.
import { randomBytes } from "node:crypto";
import {
  audit,
  exec,
  getQuote,
  getSettings,
  kvGet,
  kvSet,
  one,
  saveQuote,
  transaction,
} from "./db";
import { HttpError, textField } from "./security";
import { normalizeQuote } from "./normalize";
import { insertPreparedOrder, newOrderId } from "./orders";
import { effectiveQuoteStatus, lineHT } from "../requests";
import { addDays, parisNow } from "../shop";
import { isOpenDay } from "../pickup";
import {
  quoteTransitions,
  type FreeItem,
  type FreeUnit,
  type Order,
  type ProDetails,
  type Quote,
  type QuoteLine,
  type QuoteStatus,
} from "../types";

export const VAT_RATES = [0, 210, 550, 1000, 2000];
export const DEFAULT_CONDITIONS =
  "Paiement lors du retrait en boutique. Quantités et poids définitifs selon la préparation.";
/** Statuts dans lesquels le contenu du devis peut être modifié. */
const EDITABLE: QuoteStatus[] = ["Demande reçue", "En étude", "Devis établi"];

export function quoteStatus(quote: Quote, today = parisNow().date): QuoteStatus {
  return effectiveQuoteStatus(quote, today);
}

const freeLine = (item: FreeItem): QuoteLine => ({
  designation: [
    item.name,
    item.cut,
    item.portionGrams ? `${item.portionGrams} g par pièce` : "",
    item.packaging,
    item.note,
  ]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 160),
  quantity: item.quantity,
  unit: item.unit === "piece" ? "pièce" : item.unit,
  unitPrice: 0,
  vatRate: 550,
});

export function createQuoteRequest(input: {
  key: string;
  details: ProDetails;
  items: FreeItem[];
  notes: string;
  date: string;
  time: string;
  companyId: string;
}) {
  return transaction(async () => {
    const prior = await one<{ data: string }>("SELECT data FROM quotes WHERE request_key = ?", input.key);
    if (prior) return { quote: normalizeQuote(JSON.parse(prior.data)), created: false };
    const at = new Date().toISOString();
    const quote: Quote = {
      id: `DV-${randomBytes(4).toString("hex").toUpperCase()}`,
      token: randomBytes(24).toString("hex"),
      number: null,
      status: "Demande reçue",
      createdAt: at,
      updatedAt: at,
      version: 1,
      source: "pro",
      companyId: input.companyId,
      customer: {
        name: input.details.contactName,
        company: input.details.company,
        phone: input.details.phone,
        email: input.details.email,
        address: input.details.billingAddress,
      },
      request: {
        items: input.items,
        instructions: input.notes,
        date: input.date,
        time: input.time,
        pro: input.details,
      },
      // Lignes préremplies sans prix : la boucherie fixe chaque tarif.
      lines: input.items.map(freeLine),
      // Validité proposée par défaut, modifiable avant l'établissement.
      validUntil: addDays(parisNow().date, 30),
      conditions: DEFAULT_CONDITIONS,
      message: "",
      orderId: null,
      history: [{ status: "Demande reçue", at }],
      internalNotes: [],
    };
    await exec(
      "INSERT INTO quotes (id, token, request_key, data) VALUES (?, ?, ?, ?)",
      quote.id,
      quote.token,
      input.key,
      JSON.stringify(quote),
    );
    return { quote, created: true };
  });
}

/** Devis créé par la boucherie (client particulier ou professionnel). */
export async function createBlankQuote(customer: Quote["customer"], companyId: string | null, by: string) {
  const at = new Date().toISOString();
  const quote: Quote = {
    id: `DV-${randomBytes(4).toString("hex").toUpperCase()}`,
    token: randomBytes(24).toString("hex"),
    number: null,
    status: "En étude",
    createdAt: at,
    updatedAt: at,
    version: 1,
    source: "manuel",
    companyId,
    customer,
    request: null,
    lines: [],
    validUntil: addDays(parisNow().date, 30),
    conditions: DEFAULT_CONDITIONS,
    message: "",
    orderId: null,
    history: [{ status: "En étude", at, by }],
    internalNotes: [],
  };
  await exec(
    "INSERT INTO quotes (id, token, request_key, data) VALUES (?, ?, NULL, ?)",
    quote.id,
    quote.token,
    JSON.stringify(quote),
  );
  await audit(by, "devis.creation", "quote", quote.id);
  return quote;
}

export function parseCustomer(raw: unknown): Quote["customer"] {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: textField(c.name, "Nom du client", 120, 2),
    company: textField(c.company ?? "", "Entreprise", 160, 0),
    phone: textField(c.phone ?? "", "Téléphone", 25, 0),
    email: textField(c.email ?? "", "E-mail", 150, 0),
    address: textField(c.address ?? "", "Adresse", 300, 0),
  };
}

export function parseLines(raw: unknown): QuoteLine[] {
  if (!Array.isArray(raw) || raw.length > 80) throw new HttpError(400, "Lignes invalides.");
  return raw.map((value, n) => {
    const l = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const quantity = Number(l.quantity);
    const unitPrice = Number(l.unitPrice);
    const vatRate = Number(l.vatRate);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000)
      throw new HttpError(400, `Ligne ${n + 1} : quantité invalide.`);
    if (!Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > 100_000_000)
      throw new HttpError(400, `Ligne ${n + 1} : prix invalide.`);
    if (!VAT_RATES.includes(vatRate)) throw new HttpError(400, `Ligne ${n + 1} : taux de TVA invalide.`);
    return {
      designation: textField(l.designation, `Ligne ${n + 1} : désignation`, 160),
      quantity: Math.round(quantity * 1000) / 1000,
      unit: textField(l.unit ?? "", `Ligne ${n + 1} : unité`, 20, 0),
      unitPrice,
      vatRate,
    };
  });
}

async function load(id: string, version: unknown) {
  const quote = await getQuote(id);
  if (!quote) throw new HttpError(404, "Devis introuvable.");
  if (version !== quote.version)
    throw new HttpError(409, "Ce devis a été modifié ailleurs. Rechargez la page.");
  return quote;
}

/** Modifie le contenu d'un devis (client, lignes, validité, conditions). */
export function updateQuote(
  id: string,
  version: unknown,
  edit: Pick<Quote, "customer" | "lines" | "validUntil" | "conditions" | "message">,
  by: string,
) {
  return transaction(async () => {
    const quote = await load(id, version);
    if (!EDITABLE.includes(quoteStatus(quote)))
      throw new HttpError(
        409,
        "Ce devis n’est plus modifiable. Repassez-le en « Devis établi » pour le corriger.",
      );
    if (edit.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(edit.validUntil))
      throw new HttpError(400, "Date de validité invalide.");
    const next: Quote = {
      ...quote,
      ...edit,
      updatedAt: new Date().toISOString(),
      version: quote.version + 1,
    };
    await saveQuote(next);
    await audit(by, "devis.modification", "quote", id, { lignes: edit.lines.length });
    return next;
  });
}

async function nextNumber() {
  const year = parisNow().date.slice(0, 4);
  const key = `quote-seq-${year}`;
  const n = Number((await kvGet(key)) || 0) + 1;
  await kvSet(key, String(n));
  return `D${year}-${String(n).padStart(4, "0")}`;
}

export function changeQuoteStatus(id: string, to: QuoteStatus, version: unknown, by: string) {
  return transaction(async () => {
    const quote = await load(id, version);
    const current = quoteStatus(quote);
    if (to === "Converti en commande")
      throw new HttpError(400, "Utilisez « Convertir en commande ».");
    if (!quoteTransitions[current].includes(to))
      throw new HttpError(409, `Un devis « ${current} » ne peut pas passer à « ${to} ».`);
    const today = parisNow().date;
    let number = quote.number;
    if (to === "Devis établi") {
      if (!quote.lines.length) throw new HttpError(400, "Ajoutez au moins une ligne au devis.");
      if (quote.lines.some((l) => l.unitPrice <= 0))
        throw new HttpError(400, "Chaque ligne doit avoir un prix : aucun article n’est offert par défaut.");
      if (!quote.validUntil || quote.validUntil < today)
        throw new HttpError(400, "Indiquez une date de validité à venir.");
      if (!quote.customer.name) throw new HttpError(400, "Indiquez le nom du client.");
      number ??= await nextNumber();
    }
    if (to === "Accepté" && quote.validUntil && quote.validUntil < today)
      throw new HttpError(409, "Ce devis a expiré. Établissez-en une nouvelle version.");
    const at = new Date().toISOString();
    const next: Quote = {
      ...quote,
      number,
      status: to,
      updatedAt: at,
      version: quote.version + 1,
      history: [...quote.history, { status: to, at, by }],
    };
    await saveQuote(next);
    await audit(by, "devis.statut", "quote", id, { from: current, to, number });
    return next;
  });
}

const toFreeUnit = (unit: string): FreeUnit =>
  unit === "kg" ? "kg" : unit === "g" ? "g" : "piece";

/**
 * Crée la commande d'un devis accepté. Le devis original est conservé ; une
 * seconde conversion est impossible (contrôle dans la transaction).
 */
export function convertQuote(
  id: string,
  version: unknown,
  pickup: { date: string; time: string },
  by: string,
) {
  return transaction(async () => {
    const quote = await load(id, version);
    if (quote.orderId || quote.status === "Converti en commande")
      throw new HttpError(409, "Ce devis a déjà été converti en commande.");
    if (quote.status !== "Accepté")
      throw new HttpError(409, "Seul un devis accepté peut être converti en commande.");
    // Un devis porte souvent sur un événement lointain : on exige seulement un
    // jour d'ouverture à venir (fermetures exceptionnelles comprises).
    const settings = await getSettings();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup.date) || pickup.date < parisNow().date)
      throw new HttpError(400, "La date de retrait ne peut pas être passée.");
    if (!isOpenDay(settings.pickup, pickup.date))
      throw new HttpError(400, "La boutique est fermée ce jour-là.");
    if (pickup.time && !/^\d{2}:\d{2}$/.test(pickup.time))
      throw new HttpError(400, "Heure de retrait invalide.");
    const at = new Date().toISOString();
    const items: FreeItem[] = quote.lines.map((line) => {
      const ht = lineHT(line);
      const ttc = ht + Math.round((ht * line.vatRate) / 10000);
      return {
        kind: "libre",
        name: line.designation,
        quantity: line.quantity,
        unit: toFreeUnit(line.unit),
        note: line.unit && !["kg", "g", "pièce"].includes(line.unit) ? `Unité : ${line.unit}` : "",
        price: null,
        total: ttc,
      };
    });
    const order: Order = {
      id: newOrderId("devis"),
      token: randomBytes(24).toString("hex"),
      createdAt: at,
      updatedAt: at,
      status: "Acceptée",
      origin: "devis",
      customerType: quote.companyId ? "pro" : "particulier",
      name: quote.customer.company
        ? `${quote.customer.company} (${quote.customer.name})`
        : quote.customer.name,
      email: quote.customer.email,
      phone: quote.customer.phone,
      whatsappOptIn: false,
      date: pickup.date,
      time: pickup.time,
      notes: quote.request?.instructions || "",
      items,
      total: items.reduce((s, i) => s + (i.total || 0), 0),
      history: [{ status: "Acceptée", at, by }],
      quoteId: quote.id,
      ...(quote.companyId ? { companyId: quote.companyId } : {}),
      ...(quote.request?.pro ? { pro: quote.request.pro } : {}),
      internalNotes: [],
    };
    await insertPreparedOrder(order, `quote:${quote.id}`);
    const next: Quote = {
      ...quote,
      status: "Converti en commande",
      orderId: order.id,
      updatedAt: at,
      version: quote.version + 1,
      history: [...quote.history, { status: "Converti en commande", at, by }],
    };
    await saveQuote(next);
    await audit(by, "devis.conversion", "quote", id, { order: order.id });
    return { quote: next, order };
  });
}

export function addQuoteNote(id: string, text: string, by: string) {
  return transaction(async () => {
    const quote = await getQuote(id);
    if (!quote) throw new HttpError(404, "Devis introuvable.");
    const next: Quote = {
      ...quote,
      internalNotes: [
        ...quote.internalNotes,
        { id: randomBytes(6).toString("hex"), at: new Date().toISOString(), by, text },
      ],
    };
    await saveQuote(next);
    await audit(by, "devis.note", "quote", id);
    return next;
  });
}

/** Vue client d'un devis : sans notes internes. Les lignes et prix ne sont
 *  visibles qu'une fois le devis établi. */
export function publicQuote(quote: Quote) {
  const status = quoteStatus(quote);
  const issued = !!quote.number && status !== "Demande reçue" && status !== "En étude";
  return {
    id: quote.id,
    number: issued ? quote.number : null,
    status,
    createdAt: quote.createdAt,
    customer: quote.customer,
    request: quote.request,
    lines: issued ? quote.lines : [],
    validUntil: issued ? quote.validUntil : "",
    conditions: issued ? quote.conditions : "",
    message: issued ? quote.message : "",
  };
}
