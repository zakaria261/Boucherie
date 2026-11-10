"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import {
  categories,
  unitShort,
  units,
  type PreparationOption,
  type Product,
  type Unit,
} from "@/lib/types";
import { DEFAULT_WEIGHTS, formatStock, formatWeight, isWeighed, money } from "@/lib/shop";
import { api } from "./api";
import { ImageField } from "./image-field";
import { NavHeader, Section, Segmented, Sheet, Stepper, Toggle, useHud } from "./ui";

const empty: Product = {
  id: "",
  name: "",
  price: 0,
  unit: "kg",
  weights: [],
  category: "Bœuf",
  image: "",
  grill: false,
  description: "",
  ingredients: "",
  origin: "",
  allergens: "",
  cooking: "",
  servingAdvice: "",
  preparations: [],
  badge: "",
  published: false,
  available: true,
  featured: false,
  readyToday: false,
  stock: null,
  version: 0,
};
const priceLabel: Record<Unit, string> = {
  kg: "Prix au kilogramme (€)",
  "100g": "Prix pour 100 g (€)",
  piece: "Prix à la pièce (€)",
  lot: "Prix du lot (€)",
};
const unitNames: Record<Unit, string> = { kg: "Au kg", "100g": "Aux 100 g", piece: "Pièce", lot: "Lot" };
const weightPresets: Record<"kg" | "100g", number[]> = {
  kg: [150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000],
  "100g": [50, 100, 150, 200, 250, 300, 500],
};
const optionPresets: PreparationOption[] = [
  { name: "Découpe", choices: ["En tranches", "En morceaux", "Entier"] },
  { name: "Épaisseur", choices: ["1 cm", "2 cm", "3 cm"] },
  { name: "Désossage", choices: ["Avec os", "Désossé"] },
  { name: "Conditionnement", choices: ["Papier boucher", "Barquette"] },
  { name: "Sous-vide", choices: [] },
];

export function ProductEditor({ initial }: { initial?: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial || empty),
    [price, setPrice] = useState(initial ? (initial.price / 100).toFixed(2) : ""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [deleting, setDeleting] = useState(false);
  const { hud, show } = useHud();

  function change<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const weighed = isWeighed(product.unit);
  const weights = product.weights.length
    ? product.weights
    : weighed
      ? DEFAULT_WEIGHTS[product.unit as "kg" | "100g"]
      : [];

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    const value = Math.round(Number(price.replace(",", ".")) * 100);
    if (!product.name.trim()) return setError("Indiquez le nom du produit.");
    if (!Number.isFinite(value) || value < 1) return setError("Indiquez un prix valide.");
    if (!product.image) return setError("Ajoutez une photo du produit.");
    setBusy(true);
    try {
      const result = await api<{ product: Product }>(
        product.id ? `/api/admin/produits/${encodeURIComponent(product.id)}` : "/api/admin/produits",
        product.id ? "PUT" : "POST",
        {
          ...product,
          price: value,
          weights: weighed ? product.weights : [],
          preparations: product.preparations.filter((o) => o.name.trim()),
        },
      );
      setProduct(result.product);
      setDirty(false);
      show("Produit enregistré");
      if (!product.id)
        router.replace(`/admin/produits/${encodeURIComponent(result.product.id)}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/produits/${encodeURIComponent(product.id)}`, "DELETE", {
        version: product.version,
      });
      setDirty(false);
      router.push("/admin/produits");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setDeleting(false);
    }
  }

  const setOption = (index: number, option: PreparationOption | null) =>
    change(
      "preparations",
      option
        ? product.preparations.map((o, i) => (i === index ? option : o))
        : product.preparations.filter((_, i) => i !== index),
    );

  return (
    <form onSubmit={save} className="editor">
      <NavHeader
        title={product.id ? product.name || "Produit" : "Nouveau produit"}
        large={false}
        back={{ href: "/admin/produits", label: "Produits" }}
        actions={
          <button type="submit" className="nav-text strong" disabled={busy || uploading}>
            Enregistrer
          </button>
        }
      />
      <div className="content">
        <Section title="Photo">
          <div className="pad">
            <ImageField value={product.image} onChange={(v) => change("image", v)} onBusy={setUploading} />
          </div>
        </Section>

        <Section title="Le produit">
          <label className="field">
            <span>Nom du produit</span>
            <input
              required
              maxLength={120}
              value={product.name}
              onChange={(e) => change("name", e.target.value)}
              placeholder="Ex. Côte de bœuf maturée"
            />
          </label>
          <label className="field">
            <span>Catégorie</span>
            <select value={product.category} onChange={(e) => change("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Étiquette sur la photo</span>
            <input
              maxLength={50}
              value={product.badge}
              onChange={(e) => change("badge", e.target.value)}
              placeholder="Ex. Fait maison"
            />
          </label>
        </Section>

        <Section title="Vente" footer="Le client choisit une portion ; le prix final est calculé au poids préparé.">
          <div className="pad">
            <Segmented
              label="Unité de vente"
              value={product.unit}
              onChange={(u) => {
                change("unit", u);
                change("weights", []);
              }}
              options={units.map((u) => ({ value: u, label: unitNames[u] }))}
            />
          </div>
          <label className="field">
            <span>{priceLabel[product.unit]}</span>
            <input
              required
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          {weighed && (
            <div className="field">
              <span>Portions proposées</span>
              <div className="chip-wrap">
                {weightPresets[product.unit as "kg" | "100g"].map((w) => (
                  <button
                    type="button"
                    key={w}
                    className="chip"
                    aria-pressed={weights.includes(w)}
                    onClick={() => {
                      const next = weights.includes(w)
                        ? weights.filter((x) => x !== w)
                        : [...weights, w].sort((a, b) => a - b);
                      if (next.length) change("weights", next);
                    }}
                  >
                    {formatWeight(w)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Options de préparation"
          footer="Le client les choisit sur la fiche produit. Il peut aussi écrire une demande libre en commandant."
        >
          {product.preparations.map((o, i) => (
            <div className="option-row" key={i}>
              <input
                aria-label="Nom de l’option"
                value={o.name}
                maxLength={60}
                placeholder="Nom (ex. Épaisseur)"
                onChange={(e) => setOption(i, { ...o, name: e.target.value })}
              />
              <input
                aria-label="Choix séparés par des virgules"
                value={o.choices.join(", ")}
                placeholder="Choix séparés par des virgules (vide : case à cocher)"
                onChange={(e) =>
                  setOption(i, {
                    ...o,
                    choices: e.target.value
                      .split(",")
                      .map((c) => c.trimStart())
                      .filter((c, n, all) => c || n === all.length - 1)
                      .slice(0, 12),
                  })
                }
                onBlur={() => setOption(i, { ...o, choices: o.choices.map((c) => c.trim()).filter(Boolean) })}
              />
              <button type="button" className="nav-icon" aria-label={`Supprimer l’option ${o.name}`} onClick={() => setOption(i, null)}>
                <X size={18} />
              </button>
            </div>
          ))}
          <div className="pad chip-wrap">
            {optionPresets
              .filter((p) => !product.preparations.some((o) => o.name === p.name))
              .map((p) => (
                <button
                  type="button"
                  key={p.name}
                  className="chip"
                  onClick={() => change("preparations", [...product.preparations, p])}
                >
                  <Plus size={14} /> {p.name}
                </button>
              ))}
            <button
              type="button"
              className="chip"
              onClick={() => change("preparations", [...product.preparations, { name: "", choices: [] }])}
            >
              <Plus size={14} /> Autre
            </button>
          </div>
        </Section>

        <Section title="Au comptoir">
          <Toggle label="Publier le produit" detail="Visible sur le site" checked={product.published} onChange={(v) => change("published", v)} />
          <Toggle label="Disponible à la commande" detail="Les clients peuvent l’ajouter au panier" checked={product.available} onChange={(v) => change("available", v)} />
          <Toggle label="Mettre à la une" detail="Sur l’accueil du site" checked={product.featured} onChange={(v) => change("featured", v)} />
          <Toggle label="Sélection barbecue" checked={product.grill} onChange={(v) => change("grill", v)} />
          <Toggle label="Prêt aujourd’hui" detail="Retrait possible le jour même" checked={product.readyToday} onChange={(v) => change("readyToday", v)} />
          <Toggle
            label="Suivre le stock"
            checked={product.stock !== null}
            onChange={(v) => change("stock", v ? 0 : null)}
          />
          {product.stock !== null && (
            <div className="row stepper-row">
              <Stepper
                label="stock"
                value={product.stock}
                step={weighed ? (product.unit === "kg" ? 500 : 100) : 1}
                onChange={(v) => change("stock", v)}
                format={(v) => formatStock(product.unit, v)}
              />
            </div>
          )}
        </Section>

        <Section
          title="Informations pour le client"
          footer="N’indiquez que des informations vérifiées. Les champs vides n’apparaissent pas sur le site."
        >
          {(
            [
              ["description", "Description", "Texture, goût, usage…", 3000],
              ["origin", "Origine", "Ex. Né, élevé et abattu en France", 300],
              ["ingredients", "Composition", "Pour les préparations : ingrédients", 2000],
              ["allergens", "Allergènes", "Ex. Contient : moutarde, céleri", 500],
              ["cooking", "Conseils de cuisson", "Ex. Saisir 3 min par face…", 1500],
              ["servingAdvice", "Quantités conseillées", "Ex. 200 g par personne", 500],
            ] as const
          ).map(([key, label, placeholder, max]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <textarea
                rows={key === "description" ? 4 : 2}
                maxLength={max}
                value={product[key]}
                placeholder={placeholder}
                onChange={(e) => change(key, e.target.value)}
              />
            </label>
          ))}
        </Section>

        {product.id && product.published && (
          <a className="btn plain" href={`/boutique/${encodeURIComponent(product.id)}`} target="_blank" rel="noreferrer">
            <ExternalLink size={17} /> Voir sur le site
          </a>
        )}
        {product.id && (
          <button type="button" className="btn plain destructive-text" onClick={() => setDeleting(true)}>
            <Trash2 size={17} /> Supprimer ce produit
          </button>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <p className="list-footer">
          Aperçu : {money(Math.round(Number(price.replace(",", ".")) * 100) || 0)} {unitShort[product.unit]}
        </p>
      </div>
      <div className="action-bar">
        <button className="btn filled large" disabled={busy || uploading}>
          {busy ? "Enregistrement…" : "Enregistrer le produit"}
        </button>
      </div>
      <Sheet open={deleting} onClose={() => setDeleting(false)} title="Supprimer le produit">
        <p className="sheet-text">
          « {product.name} » sera retiré définitivement du catalogue. Les
          commandes existantes sont conservées. Pour le retirer temporairement,
          désactivez plutôt « Publier le produit ».
        </p>
        <div className="sheet-buttons">
          <button type="button" className="btn destructive large" disabled={busy} onClick={() => void remove()}>
            Confirmer la suppression
          </button>
          <button type="button" className="btn tinted large" onClick={() => setDeleting(false)}>
            Annuler
          </button>
        </div>
      </Sheet>
      {hud}
    </form>
  );
}
