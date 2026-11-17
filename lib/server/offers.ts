// Lots et marinades : valeurs par défaut (lib/offers.ts) remplacées par la
// version enregistrée depuis Faubourg Pro (table kv).
import { defaultOffers, type Lot, type Marinade, type Offers } from "../offers";
import { kvGet, kvSet } from "./db";
import { HttpError, textField } from "./security";

const KEY = "offres";

export async function getOffers(): Promise<Offers> {
  try {
    const raw = await kvGet(KEY);
    if (!raw) return defaultOffers;
    const saved = JSON.parse(raw) as Partial<Offers>;
    return {
      marinades: Array.isArray(saved.marinades) ? saved.marinades : defaultOffers.marinades,
      lots: Array.isArray(saved.lots) ? saved.lots : defaultOffers.lots,
    };
  } catch {
    return defaultOffers;
  }
}

const id = (v: unknown, label: string) => {
  const value = textField(v, label, 60, 2);
  if (!/^[a-z0-9-]+$/.test(value)) throw new HttpError(400, `${label} invalide.`);
  return value;
};

export function parseOffers(body: Record<string, unknown>): Offers {
  if (!Array.isArray(body.marinades) || body.marinades.length > 60) throw new HttpError(400, "Marinades invalides.");
  if (!Array.isArray(body.lots) || body.lots.length > 40) throw new HttpError(400, "Lots invalides.");
  const marinades: Marinade[] = body.marinades.map((raw, n) => {
    const x = (raw || {}) as Record<string, unknown>;
    return {
      id: id(x.id, `Marinade ${n + 1}`),
      name: textField(x.name, `Marinade ${n + 1} : nom`, 60, 2),
      description: textField(x.description, `Marinade ${n + 1} : description`, 400, 5),
      ingredients: textField(x.ingredients ?? "", `Marinade ${n + 1} : ingrédients`, 800, 0),
      allergens: textField(x.allergens ?? "", `Marinade ${n + 1} : allergènes`, 300, 0),
      visible: x.visible !== false,
    };
  });
  const lots: Lot[] = body.lots.map((raw, n) => {
    const x = (raw || {}) as Record<string, unknown>;
    const items = Array.isArray(x.items) ? x.items : [];
    if (!items.length || items.length > 15) throw new HttpError(400, `Lot ${n + 1} : indiquez son contenu.`);
    const price = Number(x.price);
    if (!Number.isInteger(price) || price < 100 || price > 100000) throw new HttpError(400, `Lot ${n + 1} : prix invalide.`);
    const days = Array.isArray(x.days) ? x.days.map(Number) : [];
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new HttpError(400, `Lot ${n + 1} : jours invalides.`);
    return {
      id: id(x.id, `Lot ${n + 1}`),
      name: textField(x.name, `Lot ${n + 1} : nom`, 60, 2),
      items: items.map((i, k) => textField(i, `Lot ${n + 1}, ligne ${k + 1}`, 120, 2)),
      price,
      note: textField(x.note ?? "", `Lot ${n + 1} : précision`, 200, 0),
      days: [...new Set(days)],
      marinade: x.marinade === true,
      visible: x.visible !== false,
    };
  });
  if (new Set(lots.map((l) => l.id)).size !== lots.length || new Set(marinades.map((m) => m.id)).size !== marinades.length)
    throw new HttpError(400, "Identifiants en double.");
  return { marinades, lots };
}

export const saveOffers = (offers: Offers) => kvSet(KEY, JSON.stringify(offers));
