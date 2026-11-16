"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ChevronRight, FileText, Inbox, Plus, RefreshCw, Search, X } from "lucide-react";
import { addDays, formatTime, parisNow } from "@/lib/shop";
import { origins, type Order, type OrderOrigin } from "@/lib/types";
import { Empty, NavHeader, PUSH, Segmented, useScreenState } from "./ui";
import { useOrders } from "./shell";
import { byPickup, dayName, isRequest, late, OrderCard } from "./order-utils";

type View = "demandes" | "a-preparer" | "pretes" | "toutes";
const views: Record<View, (o: Order) => boolean> = {
  demandes: isRequest,
  "a-preparer": (o) => o.status === "Acceptée" || o.status === "En préparation",
  pretes: (o) => o.status === "Prête",
  toutes: () => true,
};
// Anciennes adresses (?vue=nouvelles…) des raccourcis.
const aliases: Record<string, View> = { nouvelles: "demandes", "en-cours": "a-preparer" };

export function OrdersScreen() {
  const { orders, refresh } = useOrders();
  const params = useSearchParams();
  const [storedView, setView] = useScreenState<View>("orders-view", "demandes");
  // Une vue mémorisée par une ancienne version de l'app retombe sur « Demandes ».
  const view: View = storedView in views ? storedView : aliases[storedView] || "demandes";
  const [search, setSearch] = useScreenState("orders-search", "");
  const [day, setDay] = useScreenState("orders-day", "");
  const [time, setTime] = useScreenState("orders-time", "");
  const [origin, setOrigin] = useScreenState<OrderOrigin | "">("orders-origin", "");
  const [kind, setKind] = useScreenState<"" | "particulier" | "pro">("orders-kind", "");
  const [lateOnly, setLateOnly] = useScreenState("orders-late", false);
  useEffect(() => {
    const v = params.get("vue");
    const next = v ? (aliases[v] || v) : null;
    if (next && next in views) setView(next as View);
    const o = params.get("origine");
    if (o && o in origins) setOrigin(o as OrderOrigin);
    if (params.get("retard") === "1") setLateOnly(true);
  }, [params, setView, setOrigin, setLateOnly]);

  const today = parisNow().date;
  const days = useMemo(
    () => [...new Set(orders.map((o) => o.date))].filter((d) => d >= addDays(today, -7)).sort(),
    [orders, today],
  );
  const presentOrigins = useMemo(() => [...new Set(orders.map((o) => o.origin))], [orders]);
  const times = day ? [...new Set(orders.filter((o) => o.date === day && o.time).map((o) => o.time))].sort() : [];
  const q = search.trim().toLowerCase().replace(/^#/, "");
  const list = orders
    .filter(views[view])
    .filter((o) => !day || o.date === day)
    .filter((o) => !time || o.time === time)
    .filter((o) => !origin || o.origin === origin)
    .filter((o) => !kind || o.customerType === kind)
    .filter((o) => !lateOnly || late(o))
    .filter(
      (o) =>
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        (o.pro?.company || "").toLowerCase().includes(q) ||
        o.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§"),
    )
    .sort(view === "toutes" ? (a, b) => -byPickup(a, b) : byPickup);
  const groups = new Map<string, Order[]>();
  for (const o of list) groups.set(o.date, [...(groups.get(o.date) || []), o]);
  const count = (v: View) => orders.filter(views[v]).length;
  const filtered = !!(day || time || origin || kind || lateOnly || q);

  return (
    <>
      <NavHeader
        title="Commandes"
        actions={
          <>
            <button type="button" className="nav-icon" aria-label="Actualiser" onClick={() => void refresh()}>
              <RefreshCw size={21} />
            </button>
            <Link transitionTypes={PUSH} href="/admin/commandes/nouvelle" className="nav-icon" aria-label="Nouvelle commande">
              <Plus size={26} />
            </Link>
          </>
        }
      />
      <div className="content">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Référence, nom, entreprise, téléphone"
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
          label="Étape"
          value={view}
          onChange={setView}
          options={[
            { value: "demandes", label: "Demandes", badge: count("demandes") },
            { value: "a-preparer", label: "À préparer" },
            { value: "pretes", label: "Prêtes" },
            { value: "toutes", label: "Toutes" },
          ]}
        />
        <Link transitionTypes={PUSH} href="/admin/devis" className="callout subtle compact">
          <FileText size={19} />
          <span>
            <strong>Devis</strong>
            <small>Demandes de devis et devis en cours</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <div className="filter-chips" role="group" aria-label="Jour de retrait">
          <button type="button" aria-pressed={!day} onClick={() => (setDay(""), setTime(""))}>
            Tous les jours
          </button>
          {days.map((d) => (
            <button type="button" key={d} aria-pressed={day === d} onClick={() => (setDay(d), setTime(""))}>
              {dayName(d)}
            </button>
          ))}
          <label className="date-chip">
            <span className="sr-only">Choisir une date</span>
            <input type="date" value={day} onChange={(e) => (setDay(e.target.value), setTime(""))} />
          </label>
        </div>
        {times.length > 1 && (
          <div className="filter-chips" role="group" aria-label="Créneau">
            <button type="button" aria-pressed={!time} onClick={() => setTime("")}>
              Tous les créneaux
            </button>
            {times.map((t) => (
              <button type="button" key={t} aria-pressed={time === t} onClick={() => setTime(t)}>
                {formatTime(t)}
              </button>
            ))}
          </div>
        )}
        <div className="filter-chips" role="group" aria-label="Origine et client">
          <button type="button" aria-pressed={kind === "pro"} onClick={() => setKind(kind === "pro" ? "" : "pro")}>
            PRO
          </button>
          <button type="button" aria-pressed={kind === "particulier"} onClick={() => setKind(kind === "particulier" ? "" : "particulier")}>
            Particuliers
          </button>
          {presentOrigins
            .filter((o) => o !== "pro")
            .map((o) => (
              <button type="button" key={o} aria-pressed={origin === o} onClick={() => setOrigin(origin === o ? "" : o)}>
                {origins[o]}
              </button>
            ))}
          <button type="button" aria-pressed={lateOnly} onClick={() => setLateOnly(!lateOnly)}>
            En retard
          </button>
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
            {filtered
              ? "Aucune commande ne correspond à ces filtres."
              : view === "demandes"
                ? "Tout est traité. Les nouvelles demandes apparaissent ici d’elles-mêmes."
                : "Aucune commande à cette étape."}
          </Empty>
        )}
        {filtered && (
          <button
            type="button"
            className="btn plain"
            onClick={() => {
              setDay("");
              setTime("");
              setOrigin("");
              setKind("");
              setLateOnly(false);
              setSearch("");
            }}
          >
            Effacer les filtres
          </button>
        )}
      </div>
    </>
  );
}
