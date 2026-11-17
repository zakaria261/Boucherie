// Guide des morceaux : fiches par défaut (lib/cut-content.ts) complétées par
// les modifications faites dans Faubourg Pro (texte, photo, produits liés),
// enregistrées dans la table kv. Une modification peut être annulée pour
// retrouver la fiche d'origine.
import { animalMaps, type AnimalId } from "../cuts";
import { cutContent, cutKey, type CutContent } from "../cut-content";
import { getProducts, kvGet, kvSet } from "./db";
import { HttpError, textField, validImage } from "./security";

const KEY = "guide-morceaux";
export type CutOverride = Partial<Omit<CutContent, "label">>;
export type GuideCut = CutContent & { id: string; key: string; edited: boolean };
export type GuideAnimal = { id: AnimalId; name: string; of: string; cuts: GuideCut[] };

export async function getOverrides(): Promise<Record<string, CutOverride>> {
  try {
    const raw = await kvGet(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Fiches complètes des trois espèces, prêtes pour le site et l'application. */
export async function getCutGuide(): Promise<GuideAnimal[]> {
  const overrides = await getOverrides();
  return animalMaps.map((a) => ({
    id: a.id,
    name: a.name,
    of: a.of,
    cuts: a.cuts.map((c) => {
      const key = cutKey(a.id, c.id);
      const override = overrides[key] || {};
      return { ...cutContent(a.id, c.id), ...override, id: c.id, key, edited: Object.keys(override).length > 0 };
    }),
  }));
}

const categoryOf: Record<AnimalId, string> = { boeuf: "Bœuf", agneau: "Agneau", veau: "Veau" };

/** Vérifie qu'une clé « espèce:morceau » existe. */
export function assertCutKey(key: string) {
  const [animal, id] = key.split(":") as [AnimalId, string];
  const map = animalMaps.find((a) => a.id === animal);
  if (!map || !map.cuts.some((c) => c.id === id)) throw new HttpError(404, "Morceau introuvable.");
  return animal;
}

/** Valide une fiche envoyée depuis l'application. */
export async function parseCutOverride(key: string, body: Record<string, unknown>): Promise<CutOverride> {
  const animal = assertCutKey(key);
  const lines = Array.isArray(body.cooking) ? body.cooking : [];
  if (!lines.length || lines.length > 8) throw new HttpError(400, "Indiquez de 1 à 8 cuissons conseillées.");
  const productIds = Array.isArray(body.productIds) ? body.productIds : [];
  // Seuls des produits de la même espèce peuvent être associés.
  const allowed = new Set(
    (await getProducts(true)).filter((p) => p.category === categoryOf[animal]).map((p) => p.id),
  );
  if (productIds.some((p) => typeof p !== "string" || !allowed.has(p)))
    throw new HttpError(400, "Produit associé invalide pour cette espèce.");
  return {
    name: textField(body.name, "Nom", 60, 2),
    summary: textField(body.summary, "Présentation", 600, 20),
    texture: textField(body.texture, "Texture", 200, 2),
    flavor: textField(body.flavor, "Saveur", 200, 2),
    bone: textField(body.bone, "Os", 200, 2),
    cooking: lines.map((l, n) => textField(l, `Cuisson ${n + 1}`, 300, 4)),
    tip: textField(body.tip, "Conseil du boucher", 500, 10),
    dish: textField(body.dish, "Idée de plat", 200, 4),
    image: body.image ? validImage(body.image) : "",
    productIds: productIds as string[],
  };
}

export async function saveOverride(key: string, value: CutOverride | null) {
  const overrides = await getOverrides();
  if (value) overrides[key] = value;
  else delete overrides[key];
  await kvSet(KEY, JSON.stringify(overrides));
}
