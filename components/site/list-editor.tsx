"use client";
import { useId, useRef } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { freeQuantity, indicativeWeight, weightLabel } from "@/lib/requests";
import type { FreeUnit } from "@/lib/types";

export type DraftItem = {
  key: string;
  name: string;
  quantity: string;
  unit: FreeUnit | "";
  note: string;
  cut: string;
  portionGrams: string;
  packaging: string;
};

export const emptyItem = (): DraftItem => ({
  key: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()),
  name: "",
  quantity: "",
  unit: "",
  note: "",
  cut: "",
  portionGrams: "",
  packaging: "",
});

const unitChoices: { value: FreeUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "piece", label: "pièces" },
];

const toNumber = (v: string) => Number(v.replace(",", "."));

/** Données envoyées au serveur (qui revalide tout). */
export const serializeItems = (items: DraftItem[], pro: boolean) =>
  items.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    note: i.note,
    ...(pro ? { cut: i.cut, portionGrams: i.portionGrams || null, packaging: i.packaging } : {}),
  }));

/** Une ligne est-elle vide (aucune saisie) ? */
export const blank = (i: DraftItem) => !i.name.trim() && !i.quantity.trim() && !i.note.trim();

/** Libellé de quantité lisible pour le récapitulatif. */
export function draftQuantity(i: DraftItem) {
  const q = toNumber(i.quantity);
  return i.unit && Number.isFinite(q) && q > 0 ? freeQuantity(q, i.unit) : "";
}
export function draftWeight(i: DraftItem) {
  const q = toNumber(i.quantity);
  if (!i.unit || !Number.isFinite(q) || q <= 0) return null;
  const g = toNumber(i.portionGrams);
  return indicativeWeight({ quantity: q, unit: i.unit, portionGrams: Number.isFinite(g) && g > 0 ? g : null });
}

/**
 * Carnet de courses : lignes éditables directement, accessibles au clavier et
 * au lecteur d'écran. Les exemples sont affichés en texte indicatif seulement.
 */
export function ListEditor({
  items,
  onChange,
  errors,
  pro = false,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  errors: Record<number, string>;
  pro?: boolean;
}) {
  const id = useId();
  const list = useRef<HTMLOListElement>(null);
  const update = (index: number, patch: Partial<DraftItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const focusRow = (index: number) =>
    requestAnimationFrame(() =>
      list.current?.querySelectorAll<HTMLInputElement>(".list-name")[index]?.focus({ preventScroll: false }),
    );

  return (
    <div className="notebook">
      <p className="notebook-examples">
        Exemples de saisie : Viande hachée — 500 g · Brochettes de poulet — 6 pièces · Rôti de veau — 1 kg
      </p>
      <ol className="notebook-lines" ref={list}>
        {items.map((item, index) => {
          const error = errors[index];
          const weight = pro && item.unit === "piece" ? draftWeight(item) : null;
          return (
            <li key={item.key} className={`notebook-line ${error ? "has-error" : ""}`}>
              <span className="notebook-number" aria-hidden="true">
                {index + 1}
              </span>
              <div className="notebook-fields">
                <label className="notebook-name">
                  <span className="sr-only">Article {index + 1}</span>
                  <input
                    className="list-name"
                    value={item.name}
                    maxLength={120}
                    enterKeyHint="next"
                    autoComplete="off"
                    placeholder={pro ? "Désignation (ex. : steak haché)" : "Article (ex. : viande hachée)"}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-e${index}` : undefined}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </label>
                <div className="notebook-qty">
                  <label>
                    <span className="sr-only">Quantité {pro ? "totale " : ""}de l’article {index + 1}</span>
                    <input
                      inputMode="decimal"
                      enterKeyHint="next"
                      placeholder={pro ? "Qté totale" : "Qté"}
                      value={item.quantity}
                      maxLength={9}
                      aria-invalid={!!error}
                      onChange={(e) => update(index, { quantity: e.target.value.replace(/[^\d.,]/g, "") })}
                    />
                  </label>
                  <div className="unit-choice" role="radiogroup" aria-label={`Unité de l’article ${index + 1}`}>
                    {unitChoices.map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        role="radio"
                        aria-checked={item.unit === u.value}
                        onClick={() => update(index, { unit: u.value })}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
                {pro && (
                  <div className="notebook-pro">
                    <label>
                      <span>Découpe souhaitée</span>
                      <input value={item.cut} maxLength={120} placeholder="Ex. : tranches de 2 cm" onChange={(e) => update(index, { cut: e.target.value })} />
                    </label>
                    <label>
                      <span>Poids cible par pièce (g)</span>
                      <input
                        inputMode="numeric"
                        value={item.portionGrams}
                        maxLength={6}
                        placeholder="Ex. : 150"
                        onChange={(e) => update(index, { portionGrams: e.target.value.replace(/[^\d]/g, "") })}
                      />
                    </label>
                    <label>
                      <span>Conditionnement</span>
                      <input value={item.packaging} maxLength={120} placeholder="Ex. : sous vide par 10" onChange={(e) => update(index, { packaging: e.target.value })} />
                    </label>
                  </div>
                )}
                {weight && (
                  <p className="notebook-hint">
                    Poids total indicatif : {weightLabel(weight)} ({item.quantity} × {item.portionGrams} g). Ni poids final garanti, ni prix.
                  </p>
                )}
                <label className="notebook-note">
                  <span className="sr-only">Précisions pour l’article {index + 1}</span>
                  <input
                    value={item.note}
                    maxLength={300}
                    placeholder="Précisions : découpe, assaisonnement, conditionnement… (facultatif)"
                    onChange={(e) => update(index, { note: e.target.value })}
                  />
                </label>
                {error && (
                  <p className="field-error" id={`${id}-e${index}`} role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="notebook-actions">
                <button type="button" aria-label={`Monter l’article ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Descendre l’article ${index + 1}`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                {pro && (
                  <button
                    type="button"
                    aria-label={`Dupliquer l’article ${index + 1}`}
                    onClick={() => {
                      const next = [...items];
                      next.splice(index + 1, 0, { ...item, key: emptyItem().key });
                      onChange(next);
                      focusRow(index + 1);
                    }}
                  >
                    <Copy size={16} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Supprimer l’article ${index + 1}`}
                  disabled={items.length === 1 && blank(item)}
                  onClick={() => onChange(items.length === 1 ? [emptyItem()] : items.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="button outline notebook-add"
        onClick={() => {
          onChange([...items, emptyItem()]);
          focusRow(items.length);
        }}
      >
        <Plus size={18} /> Ajouter un article
      </button>
    </div>
  );
}
