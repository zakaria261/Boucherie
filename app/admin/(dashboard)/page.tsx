import { requireAdminPage } from "@/lib/server/security";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { getOrders, getProducts, getSettings } from "@/lib/server/db";
import { money } from "@/lib/shop";
export default async function Dashboard() {
  await requireAdminPage();
  const products = getProducts(true),
    orders = getOrders(),
    settings = getSettings();
  const waiting = orders.filter((o) => o.status === "Nouvelle");
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-date">{today}</div>
          <h1>Bonjour, chef.</h1>
          <p>Un œil sur votre boutique. Et toute la journée devant vous.</p>
        </div>
        <Link className="button primary" href="/admin/produits/nouveau">
          <Plus size={17} /> Ajouter un produit
        </Link>
      </div>
      <div className="admin-stats">
        <div>
          <span className="stat-icon">
            <Package />
          </span>
          <small>Produits au catalogue</small>
          <strong>{products.length}</strong>
          <span>
            {products.filter((p) => p.published).length} visibles en boutique
          </span>
        </div>
        <div>
          <span className="stat-icon amber">
            <Clock3 />
          </span>
          <small>Demandes à confirmer</small>
          <strong>{waiting.length.toString().padStart(2, "0")}</strong>
          <Link href="/admin/commandes">
            Voir les demandes <ArrowRight size={13} />
          </Link>
        </div>
        <div>
          <span className="stat-icon green">
            <ShoppingBag />
          </span>
          <small>Commandes en cours</small>
          <strong>
            {orders
              .filter((o) =>
                ["Confirmée", "En préparation", "Prête"].includes(o.status),
              )
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span>Du comptoir à leur table</span>
        </div>
        <div>
          <span className="stat-icon">
            <Sparkles />
          </span>
          <small>Produits à la une</small>
          <strong>
            {products
              .filter((p) => p.featured && p.published)
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span>Votre sélection sur l’accueil</span>
        </div>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Les dernières commandes</h2>
              <p>Vos clients ont bon goût.</p>
            </div>
            <Link href="/admin/commandes">
              Tout voir <ArrowUpRight size={15} />
            </Link>
          </div>
          {orders.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Montant estimé</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href="/admin/commandes">{o.id}</Link>
                        <small>
                          {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                        </small>
                      </td>
                      <td>{o.name}</td>
                      <td>{money(o.total)}</td>
                      <td>
                        <span
                          className={`status-badge ${o.status === "Nouvelle" ? "pending" : ""}`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <ShoppingBag size={30} />
              <h3>Le calme avant le coup de feu.</h3>
              <p>Les demandes passées sur votre site apparaîtront ici.</p>
              <Link href="/boutique" target="_blank" className="text-link">
                Découvrir le parcours client <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </section>
        <aside className="admin-shortcuts">
          <div className="admin-store-card">
            <img src={settings.logo} alt={settings.name} />
            <span>VOTRE BOUTIQUE EN LIGNE</span>
            <h2>
              Une viande
              <br />
              comme on l’aime.
            </h2>
            <Link href="/" target="_blank">
              Voir ma boutique <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="admin-panel quick-actions">
            <h2>Les petits gestes du quotidien</h2>
            <Link href="/admin/produits">
              <Package size={19} />
              <span>
                Mettre à jour mes prix<small>Catalogue et disponibilité</small>
              </span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/admin/boutique">
              <CalendarDays size={19} />
              <span>
                Préparer ma vitrine<small>Photos, textes et coordonnées</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
