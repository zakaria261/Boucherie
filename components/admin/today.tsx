"use client";
import Link from "next/link";
import { AlertTriangle, Bell, CalendarX, ChevronRight, FileText, PackageOpen, Sun } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatStock, longDate, parisNow, addDays } from "@/lib/shop";
import { PUSH, NavHeader, Empty } from "./ui";
import { useOrders } from "./shell";
import { active, byPickup, isRequest, late, OrderCard } from "./order-utils";

export function Today({
  lowStock,
  checklist,
  pushReady,
  quotesPending,
  closed,
}: {
  lowStock: Product[];
  checklist: { label: string; href: string }[];
  pushReady: boolean;
  quotesPending: number;
  /** Jours de fermeture exceptionnelle. */
  closed: string[];
}) {
  const { orders } = useOrders();
  const today = parisNow().date;
  const live = orders.filter(active);
  const fresh = live.filter(isRequest).sort(byPickup);
  const preparing = live.filter((o) => o.status === "Acceptée" || o.status === "En préparation");
  const overdue = live.filter((o) => late(o));
  const affected = live.filter((o) => closed.includes(o.date));
  const ready = live.filter((o) => o.status === "Prête");
  const todays = live
    .filter((o) => o.date === today && !isRequest(o))
    .sort(byPickup);
  const tomorrow = live.filter((o) => o.date === addDays(today, 1));
  const date = longDate(today).replace(/^./, (c) => c.toUpperCase());

  return (
    <>
      <NavHeader title="Aujourd’hui" eyebrow="Bonjour" subtitle={date} />
      <div className="content">
        <div className="stats">
          <Link href="/admin/commandes?vue=demandes" className={`stat ${fresh.length ? "attention" : ""}`}>
            <strong>{fresh.length}</strong>
            <span>Nouvelles</span>
          </Link>
          <Link href="/admin/commandes?vue=a-preparer" className="stat">
            <strong>{preparing.length}</strong>
            <span>En préparation</span>
          </Link>
          <Link href="/admin/commandes?vue=pretes" className="stat">
            <strong>{ready.length}</strong>
            <span>Prêtes</span>
          </Link>
          <Link href="/admin/commandes?vue=toutes" className="stat">
            <strong>{todays.length}</strong>
            <span>Retraits aujourd’hui</span>
          </Link>
        </div>

        {(quotesPending > 0 || overdue.length > 0 || affected.length > 0) && (
          <div className="stats secondary">
            {quotesPending > 0 && (
              <Link transitionTypes={PUSH} href="/admin/devis" className="stat attention">
                <strong>{quotesPending}</strong>
                <span>Devis en attente</span>
              </Link>
            )}
            {overdue.length > 0 && (
              <Link href="/admin/commandes?vue=toutes&retard=1" className="stat danger">
                <strong>{overdue.length}</strong>
                <span>Retraits en retard</span>
              </Link>
            )}
          </div>
        )}

        {affected.length > 0 && (
          <Link transitionTypes={PUSH} href="/admin/plus/retraits" className="callout danger">
            <CalendarX size={20} />
            <span>
              <strong>
                {affected.length} commande{affected.length > 1 ? "s" : ""} un jour de fermeture
              </strong>
              <small>
                {affected.map((o) => o.id).slice(0, 4).join(", ")} : prévenez les clients ou rouvrez ce jour.
              </small>
            </span>
            <ChevronRight size={18} />
          </Link>
        )}

        {!pushReady && (
          <Link transitionTypes={PUSH} href="/admin/plus/notifications" className="callout">
            <Bell size={20} />
            <span>
              <strong>Activer les notifications</strong>
              <small>Soyez prévenu à chaque nouvelle commande.</small>
            </span>
            <ChevronRight size={18} />
          </Link>
        )}

        {fresh.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Demandes à valider</h2>
            {fresh.map((o) => (
              <OrderCard key={o.id} order={o} showDay />
            ))}
          </section>
        )}

        <section className="stack">
          <h2 className="section-title">Retraits du jour</h2>
          {todays.length ? (
            todays.map((o) => <OrderCard key={o.id} order={o} />)
          ) : (
            <Empty icon={<Sun size={34} />} title="Aucun retrait prévu aujourd’hui">
              {tomorrow.length
                ? `${tomorrow.length} commande${tomorrow.length > 1 ? "s" : ""} pour demain.`
                : "Les commandes du site arrivent ici automatiquement."}
            </Empty>
          )}
        </section>

        {tomorrow.length > 0 && todays.length > 0 && (
          <Link href="/admin/commandes?vue=toutes" className="callout subtle">
            <span>
              <strong>Demain</strong>
              <small>
                {tomorrow.length} commande{tomorrow.length > 1 ? "s" : ""} à préparer
              </small>
            </span>
            <ChevronRight size={18} />
          </Link>
        )}

        {lowStock.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Stocks à surveiller</h2>
            <div className="group-body">
              {lowStock.map((p) => (
                <Link transitionTypes={PUSH} key={p.id} href="/admin/stock" className="row">
                  <span className="row-icon tone-orange">
                    <PackageOpen size={18} />
                  </span>
                  <span className="row-text">
                    <span className="row-label">{p.name}</span>
                    <span className="row-detail">
                      {p.stock ? `Reste ${formatStock(p.unit, p.stock)}` : "Épuisé"}
                    </span>
                  </span>
                  <ChevronRight className="row-chevron" size={18} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {checklist.length > 0 && (
          <section className="stack">
            <h2 className="section-title">À vérifier</h2>
            <div className="group-body">
              {checklist.map((c) => (
                <Link transitionTypes={PUSH} key={c.label} href={c.href} className="row">
                  <span className="row-icon tone-yellow">
                    <AlertTriangle size={17} />
                  </span>
                  <span className="row-text">
                    <span className="row-label">{c.label}</span>
                  </span>
                  <ChevronRight className="row-chevron" size={18} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
