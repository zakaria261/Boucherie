// Catalogue des fêtes : version par défaut (lib/fetes.ts) remplacée par celle
// enregistrée depuis Faubourg Pro (table kv).
import { defaultFestive, type FestiveCatalog, type FestiveItem, type FestiveSection } from "../fetes";
import { kvGet, kvSet } from "./db";
import { HttpError, textField } from "./security";

const KEY = "catalogue-fetes";

export async function getFestive(): Promise<FestiveCatalog> {
  try {
    const raw = await kvGet(KEY);
    if (!raw) return defaultFestive;
    const saved = JSON.parse(raw) as Partial<FestiveCatalog>;
    if (!Array.isArray(saved.sections)) return defaultFestive;
    return { visible: saved.visible !== false, intro: String(saved.intro ?? defaultFestive.intro), sections: saved.sections };
  } catch {
    return defaultFestive;
  }
}

const slug = (v: unknown, label: string) => {
  const value = textField(v, label, 60, 2);
  if (!/^[a-z0-9-]+$/.test(value)) throw new HttpError(400, `${label} invalide.`);
  return value;
};

export function parseFestive(body: Record<string, unknown>): FestiveCatalog {
  if (!Array.isArray(body.sections) || !body.sections.length || body.sections.length > 20)
    throw new HttpError(400, "Rubriques invalides.");
  const ids = new Set<string>();
  const sections: FestiveSection[] = body.sections.map((raw, n) => {
    const s = (raw || {}) as Record<string, unknown>;
    const title = textField(s.title, `Rubrique ${n + 1} : titre`, 80, 2);
    if (!Array.isArray(s.items) || s.items.length > 40) throw new HttpError(400, `${title} : produits invalides.`);
    const items: FestiveItem[] = s.items.map((rawItem, k) => {
      const x = (rawItem || {}) as Record<string, unknown>;
      const label = `${title}, produit ${k + 1}`;
      const id = slug(x.id, label);
      if (ids.has(id)) throw new HttpError(400, "Identifiants en double.");
      ids.add(id);
      const details = Array.isArray(x.details) ? x.details : [];
      if (details.length > 8) throw new HttpError(400, `${label} : 8 précisions au maximum.`);
      return {
        id,
        name: textField(x.name, `${label} : nom`, 80, 2),
        description: textField(x.description ?? "", `${label} : description`, 800, 0),
        details: details.map((d, j) => textField(d, `${label} : précision ${j + 1}`, 120, 1)),
        cooking: textField(x.cooking ?? "", `${label} : cuisson`, 200, 0),
        visible: x.visible !== false,
      };
    });
    return {
      id: slug(s.id, `Rubrique ${n + 1}`),
      title,
      intro: textField(s.intro ?? "", `${title} : présentation`, 600, 0),
      items,
    };
  });
  return {
    visible: body.visible !== false,
    intro: textField(body.intro ?? "", "Message d’introduction", 800, 0),
    sections,
  };
}

export const saveFestive = (catalog: FestiveCatalog) => kvSet(KEY, JSON.stringify(catalog));
