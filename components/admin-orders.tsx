"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
} from "lucide-react";
import { statuses, type Order, type OrderStatus } from "@/lib/types";
import { money } from "@/lib/shop";
import { whatsappLink } from "@/lib/whatsapp";
import { api } from "./admin-shell";
export function AdminOrders({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState(initial),
    [selected, setSelected] = useState(initial[0]?.id || ""),
    [filter, setFilter] = useState(""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const order = orders.find((o) => o.id === selected);
  const customerWhatsapp = order
    ? whatsappLink(
        order.phone,
        `Bonjour ${order.name},\n\nConcernant votre demande ${order.id} pour le ${new Date(
          order.date + "T12:00:00",
        ).toLocaleDateString(
          "fr-FR",
        )},\n\n${order.status === "Nouvelle" ? "Nous confirmons les disponibilités avec vous." : `Votre commande est : ${order.status}.`}\n\nÀ bientôt,\nLa Boucherie du Faubourg`,
      )
    : null;
  const visible = orders.filter(
    (o) =>
      (!filter || o.status === filter) &&
      `${o.id} ${o.name} ${o.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function status(value: OrderStatus) {
    if (!order) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await api(`/api/admin/orders/${order.id}`, "PATCH", {
        status: value,
        updatedAt: order.updatedAt,
      });
      setOrders((current) =>
        current.map((o) => (o.id === order.id ? result.order : o)),
      );
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">DU COMPTOIR À LEUR TABLE</div>
          <h1>
            Les commandes <span>{orders.length}</span>
          </h1>
          <p>Des demandes à préparer. Des clients à régaler.</p>
        </div>
        <span className="admin-order-notice">
          <Clock3 size={16} />
          {orders.filter((o) => o.status === "Nouvelle").length} à confirmer
        </span>
      </div>
      <div className="orders-workspace">
        <section className="admin-panel order-list">
          <div className="admin-filter-row">
            <div className="admin-search">
              <Search size={17} />
              <input
                placeholder="Client ou référence…"
                aria-label="Rechercher une commande"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrer les commandes"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {visible.map((o) => (
            <button
              className={`order-list-item ${o.id === selected ? "selected" : ""}`}
              key={o.id}
              onClick={() => {
                setSelected(o.id);
                setError("");
                setSaved(false);
              }}
            >
              <div>
                <strong>{o.name}</strong>
                <span>{money(o.total)}</span>
              </div>
              <div>
                <small>
                  {o.id} · {o.items.length} article
                  {o.items.length > 1 ? "s" : ""}
                </small>
                <span
                  className={`status-badge ${o.status === "Nouvelle" ? "pending" : ""}`}
                >
                  {o.status}
                </span>
              </div>
              <small>
                <MapPin size={12} /> Retrait souhaité le{" "}
                {new Date(o.date + "T12:00:00").toLocaleDateString("fr-FR")}
              </small>
            </button>
          ))}
          {!visible.length && (
            <div className="admin-empty">
              <ShoppingBag size={32} />
              <h3>Aucune demande ici.</h3>
              <p>Les prochaines commandes apparaîtront dans cette liste.</p>
            </div>
          )}
        </section>
        <section className="admin-panel order-detail">
          {order ? (
            <>
              <div className="order-detail-heading">
                <div>
                  <div className="eyebrow">DEMANDE DE RETRAIT</div>
                  <h2>{order.id}</h2>
                  <small>
                    Reçue le {new Date(order.createdAt).toLocaleString("fr-FR")}
                  </small>
                </div>
                <span
                  className={`status-badge ${order.status === "Nouvelle" ? "pending" : ""}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="order-customer">
                <h3>{order.name}</h3>
                {order.email && (
                  <a href={`mailto:${order.email}`}>
                    <Mail size={15} />
                    {order.email}
                  </a>
                )}
                <a href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}>
                  <Phone size={15} />
                  {order.phone}
                </a>
                <p>
                  <MapPin size={15} /> Retrait souhaité :{" "}
                  {new Date(order.date + "T12:00:00").toLocaleDateString(
                    "fr-FR",
                  )}
                </p>
              </div>
              {order.items.map((i) => (
                <div className="order-line" key={`${i.id}-${i.grams}`}>
                  <span>
                    <strong>
                      {i.quantity} × {i.name}
                    </strong>
                    <small>
                      {i.grams} g par portion · {money(i.price)}/kg
                    </small>
                  </span>
                  <strong>{money(i.total)}</strong>
                </div>
              ))}
              <div className="order-total">
                <span>Total estimé</span>
                <strong>{money(order.total)}</strong>
              </div>
              {order.notes && (
                <div className="order-notes">
                  <strong>Le mot du client</strong>
                  <p>{order.notes}</p>
                </div>
              )}
              <div className="order-status-update">
                <label>
                  Avancement de la commande
                  <select
                    aria-label="Avancement de la commande"
                    value={order.status}
                    disabled={busy}
                    onChange={(e) => void status(e.target.value as OrderStatus)}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <p>
                  Le statut est visible sur le lien de suivi du client. Vous
                  pouvez aussi lui répondre directement sur WhatsApp.
                </p>
                {saved && (
                  <span className="inline-success" role="status">
                    <Check size={16} /> Statut enregistré
                  </span>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                {customerWhatsapp && (
                  <a
                    className="button whatsapp-button full"
                    href={customerWhatsapp}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} /> Écrire sur WhatsApp
                  </a>
                )}
                {order.email && (
                  <a
                    className="button primary full"
                    href={`mailto:${order.email}?subject=${encodeURIComponent(`Votre demande ${order.id} — Boucherie du Faubourg`)}&body=${encodeURIComponent(`Bonjour ${order.name},\n\nConcernant votre demande ${order.id} pour le ${order.date} :\n\n\nÀ bientôt,\nLa Boucherie du Faubourg`)}`}
                  >
                    <Mail size={16} /> Écrire par e-mail
                  </a>
                )}
                <a
                  className="text-link"
                  href={`/commande/suivi/${order.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir le suivi client <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          ) : (
            <div className="admin-empty">
              <ShoppingBag size={38} />
              <h3>Tout commence par une envie.</h3>
              <p>Sélectionnez une demande pour consulter ses détails.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
