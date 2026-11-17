"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Lot, Marinade, Offers } from "@/lib/offers";
import { api } from "./api";
import { NavHeader, Section, Segmented, Toggle, useHud } from "./ui";

const dayOptions = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mer"],
  [4, "Jeu"],
  [5, "Ven"],
  [6, "Sam"],
  [0, "Dim"],
] as const;

/** Lots (contenu, prix, jours) et marinades (description, ingrédients, allergènes). */
export function OffersEditor({ initial }: { initial: Offers }) {
  const [tab, setTab] = useState<"lots" | "marinades">("lots");
  const [offers, setOffers] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  const dirty = JSON.stringify(offers) !== JSON.stringify(saved);
  const setLot = (n: number, patch: Partial<Lot>) => setOffers({ ...offers, lots: offers.lots.map((l, i) => (i === n ? { ...l, ...patch } : l)) });
  const setMarinade = (n: number, patch: Partial<Marinade>) =>
    setOffers({ ...offers, marinades: offers.marinades.map((m, i) => (i === n ? { ...m, ...patch } : m)) });

  async function save() {
    setBusy(true);
    setError("");
    try {
      // Lignes de contenu vides retirées avant l'envoi.
      const clean = { ...offers, lots: offers.lots.map((l) => ({ ...l, items: l.items.map((i) => i.trim()).filter(Boolean) })) };
      const result = await api<{ offers: Offers }>("/api/admin/offres", "PUT", clean);
      setOffers(result.offers);
      setSaved(result.offers);
      show("Enregistré");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavHeader title="Lots et marinades" large={false} back={{ href: "/admin/publications", label: "Publications" }} />
      <div className="content">
        <Segmented
          label="Rubrique"
          value={tab}
          onChange={setTab}
          options={[
            { value: "lots", label: `Lots (${offers.lots.length})` },
            { value: "marinades", label: `Marinades (${offers.marinades.length})` },
          ]}
        />
        {tab === "lots" &&
          offers.lots.map((lot, n) => (
            <Section key={n} title={lot.name || "Nouveau lot"}>
              <label className="field">
                <span>Nom</span>
                <input maxLength={60} value={lot.name} onChange={(e) => setLot(n, { name: e.target.value })} />
              </label>
              <label className="field">
                <span>Contenu (une ligne par produit)</span>
                <textarea rows={Math.max(3, lot.items.length)} value={lot.items.join("\n")} onChange={(e) => setLot(n, { items: e.target.value.split("\n") })} />
              </label>
              <label className="field">
                <span>Prix (€)</span>
                <input
                  inputMode="decimal"
                  value={(lot.price / 100).toString().replace(".", ",")}
                  onChange={(e) => setLot(n, { price: Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0 })}
                />
              </label>
              <label className="field">
                <span>Précision affichée (facultatif)</span>
                <input maxLength={200} value={lot.note} onChange={(e) => setLot(n, { note: e.target.value })} />
              </label>
              <div className="field">
                <span>Jours de retrait possibles (aucun coché : tous les jours)</span>
                <div className="filter-chips">
                  {dayOptions.map(([d, label]) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={lot.days.includes(d)}
                      onClick={() => setLot(n, { days: lot.days.includes(d) ? lot.days.filter((x) => x !== d) : [...lot.days, d] })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Choix d’une marinade" detail="Pour les lots avec des produits marinés" checked={lot.marinade} onChange={(v) => setLot(n, { marinade: v })} />
              <Toggle label="Visible sur le site" checked={lot.visible} onChange={(v) => setLot(n, { visible: v })} />
              <button type="button" className="row add-row destructive-text" onClick={() => setOffers({ ...offers, lots: offers.lots.filter((_, i) => i !== n) })}>
                <Trash2 size={17} /> Supprimer ce lot
              </button>
            </Section>
          ))}
        {tab === "lots" && (
          <button
            type="button"
            className="btn tinted large"
            onClick={() =>
              setOffers({
                ...offers,
                lots: [...offers.lots, { id: `lot-${Date.now().toString(36)}`, name: "", items: [""], price: 1000, note: "", days: [], marinade: false, visible: false }],
              })
            }
          >
            <Plus size={18} /> Ajouter un lot
          </button>
        )}
        {tab === "marinades" &&
          offers.marinades.map((m, n) => (
            <Section key={n} title={m.name || "Nouvelle marinade"} footer="Ingrédients et allergènes : à recopier depuis la fiche du fournisseur. Vides, le site invite à les demander en boutique.">
              <label className="field">
                <span>Nom</span>
                <input maxLength={60} value={m.name} onChange={(e) => setMarinade(n, { name: e.target.value })} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea rows={3} maxLength={400} value={m.description} onChange={(e) => setMarinade(n, { description: e.target.value })} />
              </label>
              <label className="field">
                <span>Ingrédients</span>
                <textarea rows={3} maxLength={800} value={m.ingredients} onChange={(e) => setMarinade(n, { ingredients: e.target.value })} />
              </label>
              <label className="field">
                <span>Allergènes</span>
                <input maxLength={300} value={m.allergens} placeholder="Ex. : lait, sésame, moutarde" onChange={(e) => setMarinade(n, { allergens: e.target.value })} />
              </label>
              <Toggle label="Visible sur le site" checked={m.visible} onChange={(v) => setMarinade(n, { visible: v })} />
              <button type="button" className="row add-row destructive-text" onClick={() => setOffers({ ...offers, marinades: offers.marinades.filter((_, i) => i !== n) })}>
                <Trash2 size={17} /> Supprimer cette marinade
              </button>
            </Section>
          ))}
        {tab === "marinades" && (
          <button
            type="button"
            className="btn tinted large"
            onClick={() =>
              setOffers({
                ...offers,
                marinades: [...offers.marinades, { id: `marinade-${Date.now().toString(36)}`, name: "", description: "", ingredients: "", allergens: "", visible: false }],
              })
            }
          >
            <Plus size={18} /> Ajouter une marinade
          </button>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      {dirty && (
        <div className="action-bar">
          <button
            type="button"
            className="btn filled large"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
      {hud}
    </>
  );
}

