"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Inbox, RefreshCw, Search, X } from "lucide-react";
import { addDays, parisNow } from "@/lib/shop";
import type { Order } from "@/lib/types";
import { Empty, NavHeader, Segmented, useScreenState } from "./ui";
import { useOrders } from "./shell";
import { byPickup, dayName, OrderCard } from "./order-utils";

type View = "nouvelles" | "en-cours" | "pretes" | "toutes";
const views: Record<View, (o: Order) => boolean> = {
  nouvelles: (o) => o.status === "Nouvelle",
  "en-cours": (o) => o.status === "Confirmée" || o.status === "En préparation",
  pretes: (o) => o.status === "Prête",
  toutes: () => true,
};

export function OrdersScreen() {
  const { orders, refresh } = useOrders();
  const params = useSearchParams();
  const [view, setView] = useScreenState<View>("orders-view", "nouvelles");
  const [search, setSearch] = useScreenState("orders-search", "");
  const [day, setDay] = useScreenState("orders-day", "");
  useEffect(() => {
    const v = params.get("vue") as View | null;
    if (v && v in views) setView(v);
  }, [params, setView]);

  const today = parisNow().date;
  const days = useMemo(
    () => [...new Set(orders.map((o) => o.date))].filter((d) => d >= addDays(today, -7)).sort(),
    [orders, today],
  );
  const q = search.trim().toLowerCase().replace(/^#/, "");
  const list = orders
    .filter(views[view])
    .filter((o) => !day || o.date === day)
    .filter(
      (o) =>
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§"),
    )
    .sort(view === "toutes" ? (a, b) => -byPickup(a, b) : byPickup);
  const groups = new Map<string, Order[]>();
  for (const o of list) groups.set(o.date, [...(groups.get(o.date) || []), o]);
  const count = (v: View) => orders.filter(views[v]).length;

  return (
    <>
      <NavHeader
        title="Commandes"
        actions={
          <button type="button" className="nav-icon" aria-label="Actualiser" onClick={() => void refresh()}>
            <RefreshCw size={21} />
          </button>
        }
      />
      <div className="content">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Numéro, nom ou téléphone"
            aria-label="Rechercher une commande"
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
          label="Statut"
          value={view}
          onChange={setView}
          options={[
            { value: "nouvelles", label: "Nouvelles", badge: count("nouvelles") },
            { value: "en-cours", label: "En cours" },
            { value: "pretes", label: "Prêtes" },
            { value: "toutes", label: "Toutes" },
          ]}
        />
        <div className="filter-chips" role="group" aria-label="Jour de retrait">
          <button type="button" aria-pressed={!day} onClick={() => setDay("")}>
            Tous les jours
          </button>
          {days.map((d) => (
            <button type="button" key={d} aria-pressed={day === d} onClick={() => setDay(d)}>
              {dayName(d)}
            </button>
          ))}
          <label className="date-chip">
            <span className="sr-only">Choisir une date</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
        </div>
        {list.length ? (
          [...groups].map(([date, items]) => (
            <section key={date} className="stack">
              <h2 className="section-title">
                {dayName(date)} <span>{items.length}</span>
              </h2>
              <div className="order-grid">
                {items.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <Empty icon={<Inbox size={36} />} title="Aucune commande">
            {view === "nouvelles"
              ? "Tout est accepté. Les nouvelles commandes apparaissent ici d’elles-mêmes."
              : "Aucune commande ne correspond à ce filtre."}
          </Empty>
        )}
      </div>
    </>
  );
}
