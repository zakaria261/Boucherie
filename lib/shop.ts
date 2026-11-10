// Calculs partagés par le navigateur, le serveur et les tests.
// Ce fichier ne doit importer que des types (exécuté tel quel par node --test).
import type { Unit } from "./types";

export type CartItem = {
  id: string;
  /** Portion en grammes pour les produits au poids, 0 pour pièce et lot. */
  grams: number;
  quantity: number;
  options: string[];
};

type PricedProduct = {
  id: string;
  price: number;
  unit?: Unit;
  weights?: number[];
  available?: boolean;
};

export const MAX_QUANTITY = 20;
export const DEFAULT_WEIGHTS: Record<"kg" | "100g", number[]> = {
  kg: [250, 500, 1000, 1500, 2000],
  "100g": [100, 200, 300, 500],
};

export const money = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );

export const isWeighed = (unit: Unit = "kg") => unit === "kg" || unit === "100g";

export function weightsFor(product: { unit?: Unit; weights?: number[] }) {
  const unit = product.unit || "kg";
  if (!isWeighed(unit)) return [0];
  return product.weights?.length
    ? product.weights
    : DEFAULT_WEIGHTS[unit as "kg" | "100g"];
}

/** Prix d'une ligne, arrondi au centime par portion avant multiplication. */
export function linePrice(
  price: number,
  grams: number,
  quantity = 1,
  unit: Unit = "kg",
) {
  if (unit === "kg") return Math.round((price * grams) / 1000) * quantity;
  if (unit === "100g") return Math.round((price * grams) / 100) * quantity;
  return price * quantity;
}

/** Quantité à retirer du stock : grammes au poids, nombre sinon. */
export const stockNeed = (unit: Unit, grams: number, quantity: number) =>
  isWeighed(unit) ? grams * quantity : quantity;

export function formatWeight(grams: number) {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg`;
  }
  return `${grams} g`;
}

export function formatStock(unit: Unit, stock: number) {
  if (isWeighed(unit)) return formatWeight(stock);
  return unit === "lot"
    ? `${stock} lot${stock > 1 ? "s" : ""}`
    : `${stock} pièce${stock > 1 ? "s" : ""}`;
}

export function portionLabel(unit: Unit, grams: number) {
  if (isWeighed(unit)) return formatWeight(grams);
  return unit === "lot" ? "le lot" : "la pièce";
}

export const cartKey = (item: CartItem) =>
  `${item.id}|${item.grams}|${[...item.options].sort().join("·")}`;

export function restoreCart(
  value: unknown,
  products: PricedProduct[],
): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const product = products.find((p) => p.id === item.id);
    if (!product) continue;
    const grams = Number(item.grams);
    const options = Array.isArray(item.options)
      ? item.options.filter(
          (o): o is string => typeof o === "string" && o.length <= 120,
        )
      : [];
    if (
      !weightsFor(product).includes(grams) ||
      !Number.isInteger(item.quantity) ||
      (item.quantity as number) < 1 ||
      (item.quantity as number) > MAX_QUANTITY ||
      options.length > 10
    )
      continue;
    result.push({
      id: product.id,
      grams,
      quantity: item.quantity as number,
      options,
    });
  }
  return result;
}

const parisFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Date (AAAA-MM-JJ) et minutes écoulées depuis minuit, heure d'Amiens. */
export function parisNow(now = new Date()) {
  const parts = parisFormat.formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)!.value);
  const date = `${part("year")}-${String(part("month")).padStart(2, "0")}-${String(
    part("day"),
  ).padStart(2, "0")}`;
  return { date, minutes: part("hour") * 60 + part("minute") };
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).getUTCDay();

export function tomorrow(now = new Date()) {
  return addDays(parisNow(now).date, 1);
}

export function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** « 09:00 » → « 9h00 ». */
export const formatTime = (time: string) => {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m}`;
};
