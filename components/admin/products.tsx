"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, PackageSearch, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { categories, unitShort, type Product } from "@/lib/types";
import { formatStock, isWeighed, money } from "@/lib/shop";
import { api } from "./api";
import { Empty, NavHeader, Segmented, Sheet, Stepper, Toggle, useHud, useScreenState } from "./ui";

type View = "tous" | "en-ligne" | "masques" | "indisponibles";
const views: Record<View, (p: Product) => boolean> = {
  tous: () => true,
  "en-ligne": (p) => p.published && p.available,
  masques: (p) => !p.published,
  indisponibles: (p) => !p.available || p.stock === 0,
};

export function ProductsScreen({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  // Données du serveur à jour après chaque navigation ou actualisation.
  useEffect(() => setProducts(initial), [initial]);
  const [search, setSearch] = useScreenState("products-search", "");
  const [view, setView] = useScreenState<View>("products-view", "tous");
  const [category, setCategory] = useScreenState("products-category", "");
  const [editing, setEditing] = useState<Product | null>(null);
  const { hud, show } = useHud();
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = products.filter(
    (p) =>
      views[view](p) &&
      (!category || p.category === category) &&
      norm(p.name).includes(norm(search.trim())),
  );
  const shelves = categories.filter((c) => products.some((p) => p.category === c));

  return (
    <>
      <NavHeader
        title="Produits"
        actions={
          <Link href="/admin/produits/nouveau" className="nav-icon" aria-label="Ajouter un produit">
            <Plus size={26} />
          </Link>
        }
      />
      <div className="content">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Rechercher"
            aria-label="Rechercher un produit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" aria-label="Effacer" onClick={() => setSearch("")}>
              <X size={15} />
            </button>
          )}
        </div>
        <Segmented
          label="Filtre"
          value={view}
          onChange={setView}
          options={[
            { value: "tous", label: "Tous" },
            { value: "en-ligne", label: "En vente" },
            { value: "masques", label: "Masqués" },
            { value: "indisponibles", label: "Épuisés" },
          ]}
        />
        <div className="filter-chips" role="group" aria-label="Catégorie">
          <button type="button" aria-pressed={!category} onClick={() => setCategory("")}>
            Toutes
          </button>
          {shelves.map((c) => (
            <button type="button" key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <Link href="/admin/stock" className="callout subtle">
          <SlidersHorizontal size={20} />
          <span>
            <strong>Quantités du jour</strong>
            <small>Stocks, produits prêts aujourd’hui, épuisés</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        {list.length ? (
          <div className="group-body product-list">
            {list.map((p) => (
              <button type="button" key={p.id} className="row product-row" onClick={() => setEditing(p)}>
                <img src={p.image} alt="" loading="lazy" />
                <span className="row-text">
                  <span className="row-label">{p.name}</span>
                  <span className="row-detail">
                    {money(p.price)} {unitShort[p.unit]}
                    {p.stock !== null && ` · ${p.stock > 0 ? formatStock(p.unit, p.stock) : "épuisé"}`}
                  </span>
                  <span className="badges">
                    {!p.published && <span className="pill gray">Masqué</span>}
                    {!p.available && <span className="pill red">Indisponible</span>}
                    {p.featured && <span className="pill blue">À la une</span>}
                    {p.readyToday && <span className="pill green">Prêt aujourd’hui</span>}
                  </span>
                </span>
                <ChevronRight className="row-chevron" size={18} />
              </button>
            ))}
          </div>
        ) : (
          <Empty icon={<PackageSearch size={36} />} title="Aucun produit trouvé." />
        )}
        <p className="list-footer">{list.length} produits affichés</p>
      </div>
      {editing && (
        <QuickEdit
          key={editing.id}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
            show("Enregistré");
            router.refresh();
          }}
        />
      )}
      {hud}
    </>
  );
}

/** Feuille de modification rapide : prix, disponibilité, stock, mise en avant. */
export function QuickEdit({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [draft, setDraft] = useState(product);
  const [price, setPrice] = useState((product.price / 100).toFixed(2).replace(".", ","));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cents = Math.round(Number(price.replace(",", ".")) * 100);
  const changes: Record<string, unknown> = {};
  if (cents !== product.price) changes.price = cents;
  for (const key of ["available", "published", "featured", "grill", "readyToday", "stock"] as const)
    if (draft[key] !== product[key]) changes[key] = draft[key];
  const dirty = Object.keys(changes).length > 0;
  const weighed = isWeighed(draft.unit);
  const step = weighed ? (draft.unit === "kg" ? 500 : 100) : 1;

  async function save() {
    if (!dirty) return onClose();
    if (!Number.isFinite(cents) || cents < 1) return setError("Prix invalide.");
    setBusy(true);
    setError("");
    try {
      const { product: saved } = await api<{ product: Product }>(
        `/api/admin/produits/${encodeURIComponent(product.id)}`,
        "PATCH",
        { ...changes, version: product.version },
      );
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      dirty={dirty}
      actions={
        <button type="button" className="sheet-done" disabled={busy} onClick={() => void save()}>
          {busy ? "…" : dirty ? "Enregistrer" : "OK"}
        </button>
      }
    >
      <div className="quick-head">
        <img src={product.image} alt="" />
        <Link href={`/admin/produits/${encodeURIComponent(product.id)}`} className="btn tinted small">
          Fiche complète
        </Link>
      </div>
      <div className="group-body">
        <label className="row field-row">
          <span className="row-label">Prix {unitShort[draft.unit]}</span>
          <span className="price-input">
            <input
              inputMode="decimal"
              aria-label="Prix en euros"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            €
          </span>
        </label>
      </div>
      <div className="group-body">
        <Toggle
          label="Disponible à la commande"
          checked={draft.available}
          onChange={(v) => setDraft({ ...draft, available: v })}
        />
        <Toggle
          label="Visible sur le site"
          checked={draft.published}
          onChange={(v) => setDraft({ ...draft, published: v })}
        />
        <Toggle
          label="À la une"
          detail="Affiché sur l’accueil"
          checked={draft.featured}
          onChange={(v) => setDraft({ ...draft, featured: v })}
        />
        <Toggle
          label="Barbecue"
          checked={draft.grill}
          onChange={(v) => setDraft({ ...draft, grill: v })}
        />
        <Toggle
          label="Prêt aujourd’hui"
          detail="Réservable pour un retrait le jour même"
          checked={draft.readyToday}
          onChange={(v) => setDraft({ ...draft, readyToday: v })}
        />
      </div>
      <div className="group-body">
        <Toggle
          label="Suivre le stock"
          detail="Le site affiche la quantité restante et bloque au-delà"
          checked={draft.stock !== null}
          onChange={(v) => setDraft({ ...draft, stock: v ? (product.stock ?? 0) : null })}
        />
        {draft.stock !== null && (
          <div className="row stepper-row">
            <Stepper
              label="stock"
              value={draft.stock}
              step={step}
              onChange={(v) => setDraft({ ...draft, stock: v })}
              format={(v) => formatStock(draft.unit, v)}
            />
            <button
              type="button"
              className="btn plain destructive-text"
              onClick={() => setDraft({ ...draft, stock: 0 })}
            >
              Épuisé
            </button>
          </div>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="sheet-buttons">
        <button type="button" className="btn filled large" disabled={busy} onClick={() => void save()}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </Sheet>
  );
}
