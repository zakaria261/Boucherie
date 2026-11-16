// Règles partagées par le site, l'application et le serveur pour les listes
// de courses, demandes professionnelles et devis. Aucune dépendance autre que
// des types et ./shop.ts : exécuté tel quel par node --test.
import type {
  FreeItem,
  FreeUnit,
  OrderItem,
  Quote,
  QuoteLine,
  QuoteStatus,
} from "./types";
import { money, portionLabel } from "./shop.ts";

export const MAX_FREE_ITEMS = 60;

const number = (n: number) =>
  String(Math.round(n * 1000) / 1000).replace(".", ",");

/** « 500 g », « 1,5 kg », « 6 pièces ». */
export function freeQuantity(quantity: number, unit: FreeUnit) {
  if (unit === "piece") return `${number(quantity)} pièce${quantity > 1 ? "s" : ""}`;
  return `${number(quantity)} ${unit}`;
}

/** Libellé court d'une ligne, quel que soit son type. */
export function itemLabel(item: OrderItem) {
  if (item.kind === "libre")
    return `${item.name} — ${freeQuantity(item.quantity, item.unit)}`;
  return `${item.quantity > 1 ? `${item.quantity} × ` : ""}${portionLabel(item.unit, item.grams)} ${item.name}`;
}

/** Montant affiché : jamais « 0 € » pour un prix inconnu. */
export const amountLabel = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "À confirmer" : money(cents);

/** Total d'une commande : null dès qu'une ligne n'a pas de prix. */
export function orderTotal(items: OrderItem[]): number | null {
  let sum = 0;
  for (const item of items) {
    const value = item.finalPrice ?? item.total;
    if (value === null || value === undefined) return null;
    sum += value;
  }
  return sum;
}

/**
 * Poids total indicatif d'une ligne professionnelle (40 pièces de 150 g =
 * 6 kg). Seulement si les unités le permettent ; ce n'est ni un poids final
 * garanti ni un prix.
 */
export function indicativeWeight(item: Pick<FreeItem, "quantity" | "unit" | "portionGrams">) {
  if (item.unit === "g") return item.quantity;
  if (item.unit === "kg") return item.quantity * 1000;
  if (item.unit === "piece" && item.portionGrams) return item.quantity * item.portionGrams;
  return null;
}
export const weightLabel = (grams: number) =>
  grams >= 1000 ? `${number(grams / 1000)} kg` : `${number(grams)} g`;

export type FreeItemDraft = {
  name: string;
  quantity: string | number;
  unit: string;
  note?: string;
  cut?: string;
  portionGrams?: string | number | null;
  packaging?: string;
};

const units: FreeUnit[] = ["g", "kg", "piece"];

/**
 * Valide une liste d'articles libres. Renvoie les articles normalisés ou une
 * erreur par ligne (index → message). Utilisé côté navigateur pour guider la
 * saisie et côté serveur pour décider.
 */
export function parseFreeItems(
  raw: unknown,
  pro = false,
): { items: FreeItem[]; errors: Record<number, string>; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0)
    return { items: [], errors: {}, error: "Ajoutez au moins un article." };
  if (raw.length > MAX_FREE_ITEMS)
    return { items: [], errors: {}, error: `${MAX_FREE_ITEMS} articles au maximum.` };
  const errors: Record<number, string> = {};
  const items: FreeItem[] = [];
  raw.forEach((value, index) => {
    const row = (value && typeof value === "object" ? value : {}) as FreeItemDraft;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const quantity =
      typeof row.quantity === "number"
        ? row.quantity
        : Number(String(row.quantity ?? "").replace(",", ".").trim() || NaN);
    const unit = row.unit as FreeUnit;
    const text = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
    if (!name) errors[index] = "Indiquez l’article.";
    else if (name.length > 120) errors[index] = "Désignation trop longue (120 caractères).";
    else if (!units.includes(unit)) errors[index] = "Choisissez une unité.";
    else if (!Number.isFinite(quantity) || quantity <= 0)
      errors[index] = "La quantité doit être supérieure à zéro.";
    else if (quantity > 100000) errors[index] = "Quantité trop élevée.";
    else if (unit === "piece" && !Number.isInteger(quantity))
      errors[index] = "Le nombre de pièces doit être entier.";
    let portionGrams: number | null = null;
    if (pro && row.portionGrams !== undefined && row.portionGrams !== null && row.portionGrams !== "") {
      const g = Number(String(row.portionGrams).replace(",", "."));
      if (!Number.isFinite(g) || g <= 0 || g > 100000)
        errors[index] ??= "Le poids par pièce doit être supérieur à zéro.";
      else portionGrams = Math.round(g);
    }
    if (errors[index]) return;
    items.push({
      kind: "libre",
      name,
      quantity: Math.round(quantity * 1000) / 1000,
      unit,
      note: text(row.note, 300),
      ...(pro
        ? { cut: text(row.cut, 120), portionGrams, packaging: text(row.packaging, 120) }
        : {}),
      price: null,
      total: null,
    });
  });
  return { items, errors };
}

/** Téléphone français ou international plausible. */
export const validPhone = (phone: string) =>
  /^\+?[\d\s().-]{8,25}$/.test(phone) && phone.replace(/\D/g, "").length >= 9;
export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

/**
 * Contrôle de format du SIRET (14 chiffres, clé de Luhn). Ne vérifie pas
 * l'existence de l'entreprise. La Poste (SIREN 356000000) suit une règle
 * particulière : somme des chiffres multiple de 5.
 */
export function validSiret(siret: string) {
  const digits = siret.replace(/\s/g, "");
  if (!/^\d{14}$/.test(digits)) return false;
  if (digits.startsWith("356000000"))
    return [...digits].reduce((s, d) => s + Number(d), 0) % 5 === 0;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(digits[13 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Format d'un numéro de TVA intracommunautaire (2 lettres + 2 à 13 caractères). */
export const validVat = (vat: string) =>
  /^[A-Z]{2}[0-9A-Z+*.]{2,13}$/.test(vat.replace(/[\s.-]/g, "").toUpperCase());

/* ——— Devis : calculs exacts en centimes ——— */

/** Quantité en millièmes pour éviter les erreurs d'arrondi (2,5 kg → 2500). */
const milli = (quantity: number) => Math.round(quantity * 1000);

export function lineHT(line: Pick<QuoteLine, "quantity" | "unitPrice">) {
  return Math.round((milli(line.quantity) * line.unitPrice) / 1000);
}

export function quoteTotals(lines: QuoteLine[]) {
  const byRate = new Map<number, number>();
  let ht = 0;
  for (const line of lines) {
    const amount = lineHT(line);
    ht += amount;
    byRate.set(line.vatRate, (byRate.get(line.vatRate) || 0) + amount);
  }
  const vat = [...byRate]
    .sort(([a], [b]) => a - b)
    .map(([rate, base]) => ({ rate, base, amount: Math.round((base * rate) / 10000) }));
  const tax = vat.reduce((s, v) => s + v.amount, 0);
  return { ht, vat, tax, ttc: ht + tax };
}

/** « 5,5 % » à partir de 550. */
export const rateLabel = (rate: number) => `${String(rate / 100).replace(".", ",")} %`;

/** Statut affiché : un devis établi ou envoyé dont la validité est dépassée est expiré. */
export function effectiveQuoteStatus(quote: Pick<Quote, "status" | "validUntil">, today: string): QuoteStatus {
  if ((quote.status === "Envoyé" || quote.status === "Devis établi") && quote.validUntil && quote.validUntil < today)
    return "Expiré";
  return quote.status;
}
