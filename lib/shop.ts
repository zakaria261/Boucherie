export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  grill: boolean;
};
export type CartItem = { id: string; grams: number; quantity: number };
export const money = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const linePrice = (price: number, grams: number, quantity = 1) =>
  Math.round((price * grams) / 1000) * quantity;
export function restoreCart(value: unknown, products: Product[]): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CartItem =>
      !!item &&
      typeof item === "object" &&
      products.some((p) => p.id === item.id) &&
      [250, 500, 1000, 1500, 2000].includes(item.grams) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 20,
  );
}
export function tomorrow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)!.value);
  const date = new Date(
    Date.UTC(part("year"), part("month") - 1, part("day") + 1),
  );
  return date.toISOString().slice(0, 10);
}
