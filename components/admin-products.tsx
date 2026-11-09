"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Edit3, Package, Plus, Search } from "lucide-react";
import { categories, type Product } from "@/lib/types";
import { money } from "@/lib/shop";
export function AdminProducts({ products }: { products: Product[] }) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState("");
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!category || p.category === category) &&
      (!status || (status === "published" ? p.published : !p.published)),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">VOTRE SAVOIR-FAIRE AU COMPTOIR</div>
          <h1>
            Mes produits <span>{products.length}</span>
          </h1>
          <p>Une belle photo, le bon prix, et le plaisir de choisir.</p>
        </div>
        <Link className="button primary" href="/admin/produits/nouveau">
          <Plus size={17} /> Ajouter un produit
        </Link>
      </div>
      <div className="admin-panel">
        <div className="admin-filter-row">
          <div className="admin-search">
            <Search size={18} />
            <input
              aria-label="Rechercher un produit"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrer par catégorie"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filtrer par visibilité"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table products-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix / kg</th>
                <th>Disponibilité</th>
                <th>Visibilité</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      className="table-product"
                      href={`/admin/produits/${encodeURIComponent(p.id)}`}
                    >
                      <img src={p.image} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.featured
                            ? "★ À la une"
                            : p.grill
                              ? "Sélection barbecue"
                              : "Sélection du boucher"}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td>{p.category}</td>
                  <td className="table-price">{money(p.price)}</td>
                  <td>
                    <span
                      className={`status-badge ${p.available ? "available" : "neutral"}`}
                    >
                      {p.available ? "Disponible" : "Indisponible"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`publication ${p.published ? "published" : ""}`}
                    >
                      <i />
                      {p.published ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="table-edit"
                      href={`/admin/produits/${encodeURIComponent(p.id)}`}
                      aria-label={`Modifier ${p.name}`}
                    >
                      <Edit3 size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="admin-empty">
            <Package />
            <h3>Aucun produit trouvé.</h3>
            <p>Essayez un autre nom ou modifiez les filtres.</p>
          </div>
        )}
        <div className="table-footer">
          {filtered.length} produits affichés{" "}
          <Link href="/boutique" target="_blank">
            Voir le catalogue en ligne <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
}
