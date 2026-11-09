"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, Save, Trash2 } from "lucide-react";
import { categories, type Product } from "@/lib/types";
import { money } from "@/lib/shop";
import { api } from "./admin-shell";
import { ImageField } from "./image-field";
const empty: Product = {
  id: "",
  name: "",
  price: 0,
  category: "Bœuf",
  image: "",
  description: "",
  ingredients: "",
  badge: "",
  published: false,
  available: true,
  featured: false,
  grill: false,
  version: 0,
};
export function ProductEditor({ initial }: { initial?: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial || empty),
    [price, setPrice] = useState(
      initial ? (initial.price / 100).toFixed(2) : "",
    ),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [dirty, setDirty] = useState(false),
    [deleting, setDeleting] = useState(false);
  function change<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setSaved(false);
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
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const value = Math.round(Number(price.replace(",", ".")) * 100);
      const result = await api(
        product.id
          ? `/api/admin/produits/${encodeURIComponent(product.id)}`
          : "/api/admin/produits",
        product.id ? "PUT" : "POST",
        { ...product, price: value },
      );
      setProduct(result.product);
      setDirty(false);
      setSaved(true);
      if (!product.id)
        router.replace(
          `/admin/produits/${encodeURIComponent(result.product.id)}`,
        );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/admin/produits/${encodeURIComponent(product.id)}`,
        "DELETE",
        { version: product.version },
      );
      setDirty(false);
      router.push("/admin/produits");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={save}>
      <Link className="admin-back" href="/admin/produits">
        <ArrowLeft size={15} /> Tous les produits
      </Link>
      <div className="admin-page-heading">
        <div>
          <h1>
            {product.id ? "Le soin du détail." : "Une nouvelle belle pièce."}
          </h1>
          <p>
            {product.id
              ? product.name
              : "Ajoutez votre produit, nous lui faisons une place au comptoir."}
          </p>
        </div>
        <div className="admin-heading-actions">
          {product.id && product.published && (
            <Link
              target="_blank"
              href={`/boutique/${encodeURIComponent(product.id)}`}
              className="button outline"
            >
              <Eye size={16} /> Voir en ligne
            </Link>
          )}
          <button className="button primary" disabled={busy || uploading}>
            <Save size={17} />
            {busy ? "Enregistrement…" : "Enregistrer le produit"}
          </button>
        </div>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="save-success" role="status">
          <Check size={18} /> Produit enregistré. Vos modifications sont
          visibles dans la boutique.
        </div>
      )}
      <div className="editor-grid">
        <div>
          <section className="admin-panel form-panel">
            <h2>Les informations du produit</h2>
            <p>Le bon nom et les détails qui font la différence.</p>
            <label>
              Nom du produit
              <input
                required
                maxLength={120}
                value={product.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder="Ex. Côte de bœuf maturée"
              />
            </label>
            <div className="form-row">
              <label>
                Prix au kilogramme (€)
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
                    setSaved(false);
                  }}
                />
              </label>
              <label>
                Catégorie
                <select
                  value={product.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={5}
                maxLength={3000}
                value={product.description}
                onChange={(e) => change("description", e.target.value)}
                placeholder="Parlez de ce morceau, de sa texture, de ses saveurs…"
              />
            </label>
            <label>
              Ingrédients, allergènes, provenance & conseils
              <textarea
                rows={4}
                maxLength={2000}
                value={product.ingredients}
                onChange={(e) => change("ingredients", e.target.value)}
                placeholder="Les informations utiles à vos clients"
              />
            </label>
            <label>
              Étiquette sur la photo
              <input
                maxLength={50}
                value={product.badge}
                onChange={(e) => change("badge", e.target.value)}
                placeholder="Ex. Fait maison, Le choix du boucher…"
              />
            </label>
          </section>
          <section className="admin-panel form-panel">
            <h2>Une photo qui donne envie</h2>
            <ImageField
              value={product.image}
              onChange={(v) => change("image", v)}
              onBusy={setUploading}
            />
          </section>
        </div>
        <aside>
          <section className="admin-panel form-panel">
            <h2>Au comptoir</h2>
            <label className="toggle-row">
              <span>
                <strong>Publier le produit</strong>
                <small>Visible dans la boutique</small>
              </span>
              <input
                type="checkbox"
                checked={product.published}
                onChange={(e) => change("published", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Disponible à la commande</strong>
                <small>Les clients peuvent l’ajouter au panier</small>
              </span>
              <input
                type="checkbox"
                checked={product.available}
                onChange={(e) => change("available", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Mettre à la une</strong>
                <small>Les 4 premiers apparaissent sur l’accueil</small>
              </span>
              <input
                type="checkbox"
                checked={product.featured}
                onChange={(e) => change("featured", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Sélection barbecue</strong>
                <small>Afficher dans la page barbecue</small>
              </span>
              <input
                type="checkbox"
                checked={product.grill}
                onChange={(e) => change("grill", e.target.checked)}
              />
            </label>
          </section>
          <section className="admin-panel preview-panel">
            <div className="eyebrow">APERÇU EN BOUTIQUE</div>
            {product.image ? (
              <img src={product.image} alt="Aperçu du produit" />
            ) : (
              <div className="preview-placeholder">Votre photo ici</div>
            )}
            <small>{product.category}</small>
            <h3>{product.name || "Le nom de votre produit"}</h3>
            <strong>
              {money(
                Number.isFinite(Number(price))
                  ? Math.round(Number(price) * 100)
                  : 0,
              )}{" "}
              <small>/ kg</small>
            </strong>
          </section>
          {product.id && (
            <section className="delete-zone">
              {deleting ? (
                <>
                  <p>
                    Supprimer définitivement ce produit du catalogue ? Les
                    commandes existantes seront conservées.
                  </p>
                  <button
                    className="button danger"
                    type="button"
                    disabled={busy}
                    onClick={remove}
                  >
                    Confirmer la suppression
                  </button>
                  <button
                    className="continue-link"
                    type="button"
                    onClick={() => setDeleting(false)}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="delete-link"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={15} /> Supprimer ce produit
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
