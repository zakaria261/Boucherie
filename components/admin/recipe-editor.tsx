"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Product, Recipe, RecipeIngredient } from "@/lib/types";
import { api } from "./api";
import { ImageField } from "./image-field";
import { NavHeader, Section, Sheet, Stepper, Toggle, useHud } from "./ui";

export function RecipeEditor({ initial, products }: { initial?: Recipe; products: Product[] }) {
  const router = useRouter();
  const [recipe, setRecipe] = useState({
    title: initial?.title || "",
    intro: initial?.intro || "",
    image: initial?.image || "",
    servings: initial?.servings || 4,
    prepMinutes: initial?.prepMinutes || 15,
    cookMinutes: initial?.cookMinutes || 30,
    ingredients: initial?.ingredients || ([] as RecipeIngredient[]),
    steps: initial?.steps || [""],
    tip: initial?.tip || "",
    productIds: initial?.productIds || [],
    published: initial?.published ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { hud, show } = useHud();
  const set = (patch: Partial<typeof recipe>) => setRecipe((r) => ({ ...r, ...patch }));
  const setIngredient = (i: number, patch: Partial<RecipeIngredient> | null) =>
    set({
      ingredients: patch
        ? recipe.ingredients.map((x, n) => (n === i ? { ...x, ...patch } : x))
        : recipe.ingredients.filter((_, n) => n !== i),
    });

  async function save() {
    setError("");
    if (!recipe.title.trim()) return setError("Donnez un titre à la recette.");
    setBusy(true);
    try {
      const body = {
        ...recipe,
        steps: recipe.steps.map((s) => s.trim()).filter(Boolean),
        ingredients: recipe.ingredients.filter((i) => i.name.trim()),
        productIds: [
          ...new Set([
            ...recipe.productIds,
            ...recipe.ingredients.map((i) => i.productId).filter(Boolean),
          ]),
        ],
        version: initial?.version,
      };
      const result = await api<{ recipe: Recipe }>(
        initial ? `/api/admin/recettes/${initial.id}` : "/api/admin/recettes",
        initial ? "PUT" : "POST",
        body,
      );
      show("Recette enregistrée");
      if (!initial) router.replace(`/admin/publications/recettes/${result.recipe.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setBusy(true);
    try {
      await api(`/api/admin/recettes/${initial.id}`, "DELETE", { version: initial.version });
      router.push("/admin/publications");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="editor">
      <NavHeader
        title={initial ? recipe.title || "Recette" : "Nouvelle recette"}
        large={false}
        back={{ href: "/admin/publications", label: "Publications" }}
      />
      <div className="content">
        <Section title="Photo">
          <div className="pad">
            <ImageField label="Photo de la recette" value={recipe.image} onChange={(v) => set({ image: v })} onBusy={setUploading} />
          </div>
        </Section>
        <Section title="La recette">
          <label className="field">
            <span>Titre</span>
            <input maxLength={120} value={recipe.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Introduction</span>
            <textarea rows={3} maxLength={600} value={recipe.intro} onChange={(e) => set({ intro: e.target.value })} />
          </label>
          <div className="row stepper-row">
            <span className="row-label">Personnes</span>
            <Stepper label="personnes" value={recipe.servings} min={1} max={30} onChange={(v) => set({ servings: v })} />
          </div>
          <div className="row stepper-row">
            <span className="row-label">Préparation</span>
            <Stepper label="minutes de préparation" value={recipe.prepMinutes} step={5} max={1440} onChange={(v) => set({ prepMinutes: v })} format={(v) => `${v} min`} />
          </div>
          <div className="row stepper-row">
            <span className="row-label">Cuisson</span>
            <Stepper label="minutes de cuisson" value={recipe.cookMinutes} step={5} max={2880} onChange={(v) => set({ cookMinutes: v })} format={(v) => `${v} min`} />
          </div>
        </Section>
        <Section
          title={`Ingrédients pour ${recipe.servings} personnes`}
          footer="Reliez la viande à un produit : le site recalcule les quantités et propose de l’ajouter au panier."
        >
          {recipe.ingredients.map((ing, i) => (
            <div className="ingredient-row" key={i}>
              <input
                aria-label="Quantité"
                inputMode="decimal"
                placeholder="Qté"
                value={ing.quantity ?? ""}
                onChange={(e) =>
                  setIngredient(i, {
                    quantity: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")),
                  })
                }
              />
              <input aria-label="Unité" placeholder="g, cl…" value={ing.unit} maxLength={20} onChange={(e) => setIngredient(i, { unit: e.target.value })} />
              <input aria-label="Ingrédient" placeholder="Ingrédient" value={ing.name} maxLength={120} onChange={(e) => setIngredient(i, { name: e.target.value })} />
              <select aria-label="Produit de la boutique" value={ing.productId} onChange={(e) => setIngredient(i, { productId: e.target.value })}>
                <option value="">Pas un produit de la boutique</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" className="nav-icon" aria-label="Supprimer l’ingrédient" onClick={() => setIngredient(i, null)}>
                <X size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="row"
            onClick={() => set({ ingredients: [...recipe.ingredients, { quantity: null, unit: "", name: "", productId: "" }] })}
          >
            <span className="row-label link">
              <Plus size={16} /> Ajouter un ingrédient
            </span>
          </button>
        </Section>
        <Section title="Étapes">
          {recipe.steps.map((s, i) => (
            <div className="step-row" key={i}>
              <span className="prep-qty">{i + 1}</span>
              <textarea
                rows={2}
                aria-label={`Étape ${i + 1}`}
                maxLength={1500}
                value={s}
                onChange={(e) => set({ steps: recipe.steps.map((x, n) => (n === i ? e.target.value : x)) })}
              />
              <button type="button" className="nav-icon" aria-label={`Supprimer l’étape ${i + 1}`} onClick={() => set({ steps: recipe.steps.filter((_, n) => n !== i) })}>
                <X size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="row" onClick={() => set({ steps: [...recipe.steps, ""] })}>
            <span className="row-label link">
              <Plus size={16} /> Ajouter une étape
            </span>
          </button>
        </Section>
        <Section title="Le conseil du boucher">
          <label className="field">
            <span className="sr-only">Conseil</span>
            <textarea rows={2} maxLength={600} value={recipe.tip} onChange={(e) => set({ tip: e.target.value })} />
          </label>
        </Section>
        <Section>
          <Toggle label="Visible sur le site" checked={recipe.published} onChange={(v) => set({ published: v })} />
        </Section>
        {initial && (
          <button type="button" className="btn plain destructive-text" onClick={() => setDeleting(true)}>
            <Trash2 size={17} /> Supprimer la recette
          </button>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="action-bar">
        <button type="button" className="btn filled large" disabled={busy || uploading} onClick={() => void save()}>
          {busy ? "Enregistrement…" : "Enregistrer la recette"}
        </button>
      </div>
      <Sheet open={deleting} onClose={() => setDeleting(false)} title="Supprimer la recette">
        <p className="sheet-text">La recette sera retirée du site.</p>
        <div className="sheet-buttons">
          <button type="button" className="btn destructive large" disabled={busy} onClick={() => void remove()}>
            Supprimer
          </button>
        </div>
      </Sheet>
      {hud}
    </div>
  );
}
