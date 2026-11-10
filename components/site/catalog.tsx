"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { categories } from "@/lib/types";
import { effectivePrice, useShop } from "./store";
import { ProductCard } from "./product-card";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Catalog({
  category = "",
  query = "",
  barbecue = false,
  focus = false,
  base = "/boutique",
}: {
  category?: string;
  query?: string;
  barbecue?: boolean;
  focus?: boolean;
  base?: string;
}) {
  const { products } = useShop();
  const router = useRouter();
  const [search, setSearch] = useState(query),
    [filter, setFilter] = useState(category),
    [sort, setSort] = useState("selection");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setFilter(category);
    setSearch(query);
    if (focus) input.current?.focus();
  }, [category, query, focus]);

  const scope = products.filter((p) => !barbecue || p.grill);
  // Seules les catégories qui contiennent des produits sont proposées.
  const shelves = categories.filter((c) => scope.some((p) => p.category === c));
  const filtered = scope
    .filter(
      (p) =>
        (!filter || p.category === filter) &&
        norm(`${p.name} ${p.category} ${p.badge}`).includes(norm(search.trim())),
    )
    .sort((a, b) =>
      sort === "asc"
        ? effectivePrice(a) - effectivePrice(b)
        : sort === "desc"
          ? effectivePrice(b) - effectivePrice(a)
          : Number(!!b.promo) - Number(!!a.promo) ||
            Number(b.featured) - Number(a.featured) ||
            Number(b.available) - Number(a.available),
    );

  function sync(name: string, text: string) {
    const params = new URLSearchParams();
    if (name) params.set("categorie", name);
    if (text) params.set("q", text);
    router.replace(`${base}${params.size ? "?" + params : ""}`, {
      scroll: false,
    });
  }

  return (
    <section className="catalog">
      <div className="catalog-tools">
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            type="search"
            enterKeyHint="search"
            aria-label="Rechercher dans la boutique"
            placeholder="Rechercher un morceau, une préparation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => sync(filter, search.trim())}
          />
          {search && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => {
                setSearch("");
                sync(filter, "");
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <label className="sort-field">
          <span className="sr-only">Trier</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="selection">Notre sélection</option>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
        </label>
      </div>
      <div className="chips" role="group" aria-label="Catégories">
        <button
          aria-pressed={!filter}
          onClick={() => {
            setFilter("");
            sync("", search);
          }}
        >
          Tout <span>{scope.length}</span>
        </button>
        {shelves.map((name) => (
          <button
            key={name}
            aria-pressed={filter === name}
            onClick={() => {
              setFilter(name);
              sync(name, search);
            }}
          >
            {name} <span>{scope.filter((p) => p.category === name).length}</span>
          </button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">
        {filtered.length} produit{filtered.length > 1 ? "s" : ""}
      </p>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Aucun produit pour cette envie.</h3>
          <p>Essayez un autre mot, ou demandez-nous : on peut souvent le préparer.</p>
          <button
            className="button outline"
            onClick={() => {
              setSearch("");
              setFilter("");
              sync("", "");
            }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </section>
  );
}
