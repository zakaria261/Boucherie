"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories } from "@/lib/types";
import { ProductCard, useShop } from "./store";
export function Catalog({
  category = "",
  query = "",
  barbecue = false,
  focus = false,
}: {
  category?: string;
  query?: string;
  barbecue?: boolean;
  focus?: boolean;
}) {
  const { products } = useShop();
  const router = useRouter();
  const [search, setSearch] = useState(query),
    [filter, setFilter] = useState(category),
    [sort, setSort] = useState("selection"),
    [available, setAvailable] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setFilter(category);
    setSearch(query);
    if (focus) input.current?.focus();
  }, [category, query, focus]);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = products
    .filter(
      (p) =>
        (!barbecue || p.grill) &&
        (!filter || p.category === filter) &&
        (!available || p.available) &&
        norm(p.name).includes(norm(search)),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.price - b.price
        : sort === "desc"
          ? b.price - a.price
          : Number(b.featured) - Number(a.featured),
    );
  function changeCategory(name: string) {
    setFilter(name);
    const params = new URLSearchParams();
    if (name) params.set("categorie", name);
    if (search) params.set("q", search);
    router.replace(
      `${barbecue ? "/barbecue" : "/boutique"}${params.size ? "?" + params : ""}`,
      { scroll: false },
    );
  }
  return (
    <section className="catalog section">
      <aside className="catalog-sidebar">
        <div className="sidebar-title">
          <SlidersHorizontal size={17} /> Votre sélection
        </div>
        <h3>Nos rayons</h3>
        <button
          className={!filter ? "chosen" : ""}
          onClick={() => changeCategory("")}
        >
          Toutes les viandes{" "}
          <span>{products.filter((p) => !barbecue || p.grill).length}</span>
        </button>
        {categories.map((name) => (
          <button
            key={name}
            className={filter === name ? "chosen" : ""}
            onClick={() => changeCategory(name)}
          >
            {name}
            <span>
              {
                products.filter(
                  (p) => p.category === name && (!barbecue || p.grill),
                ).length
              }
            </span>
          </button>
        ))}
        <div className="sidebar-stock">
          <label>
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />{" "}
            Disponibles uniquement
          </label>
        </div>
        <div className="sidebar-note">
          <strong>Une envie particulière ?</strong>
          <p>Le bon morceau, la bonne découpe… Votre boucher vous conseille.</p>
          <a href="/contact">Parlons-en ensemble ↗</a>
        </div>
      </aside>
      <div className="catalog-main">
        <div className="catalog-tools">
          <div className="catalog-search">
            <Search size={18} />
            <input
              ref={input}
              aria-label="Rechercher dans la boutique"
              placeholder="Un morceau, une envie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="icon-btn"
                aria-label="Effacer la recherche"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <select
            aria-label="Trier les produits"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="selection">Notre sélection</option>
            <option value="asc">Prix croissant</option>
            <option value="desc">Prix décroissant</option>
          </select>
        </div>
        <div className="catalog-count">
          <strong>{filter || "Tous nos produits"}</strong>
          <span>{filtered.length} produits au comptoir</span>
        </div>
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty">
            <Search />
            <h3>Aucun produit pour cette envie.</h3>
            <p>Essayez un autre mot ou explorez nos rayons.</p>
            <button
              className="button outline"
              onClick={() => {
                setSearch("");
                changeCategory("");
                setAvailable(false);
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
