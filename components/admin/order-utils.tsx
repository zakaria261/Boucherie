"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Clock3 } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { origins } from "@/lib/types";
import { amountLabel, itemLabel } from "@/lib/requests";
import { formatTime, longDate, parisNow, addDays } from "@/lib/shop";
import { PUSH, StatusPill } from "./ui";
import { useOrders } from "./shell";

export const nextAction: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  "Demande reçue": { label: "Accepter la commande", status: "Acceptée" },
  "En attente de validation": { label: "Accepter la commande", status: "Acceptée" },
  Acceptée: { label: "Commencer la préparation", status: "En préparation" },
  "En préparation": { label: "Marquer comme prête", status: "Prête" },
  Prête: { label: "Marquer comme retirée", status: "Retirée" },
};
export const shortAction: Partial<Record<OrderStatus, string>> = {
  "Demande reçue": "Accepter",
  "En attente de validation": "Accepter",
  Acceptée: "Préparer",
  "En préparation": "Prête",
  Prête: "Retirée",
};

export { itemLabel as itemLine };

/** Une demande (liste, PRO, commande du site) pas encore acceptée. */
export const isRequest = (o: Order) => o.status === "Demande reçue" || o.status === "En attente de validation";

export function dayName(date: string) {
  const today = parisNow().date;
  if (date === today) return "Aujourd’hui";
  if (date === addDays(today, 1)) return "Demain";
  if (date === addDays(today, -1)) return "Hier";
  return longDate(date).replace(/^./, (c) => c.toUpperCase());
}

export const pickupKey = (o: Order) => `${o.date} ${o.time || "99:99"}`;
export const byPickup = (a: Order, b: Order) => pickupKey(a).localeCompare(pickupKey(b));

export const active = (o: Order) => o.status !== "Retirée" && o.status !== "Annulée";

/** Retrait dépassé : date passée, ou heure passée aujourd'hui. */
export function late(o: Order, now = parisNow()) {
  if (!active(o) || isRequest(o)) return false;
  if (o.date < now.date) return true;
  if (o.date > now.date || !o.time) return false;
  const [h, m] = o.time.split(":").map(Number);
  return h * 60 + m + 30 < now.minutes;
}

/** Badge d'origine : « Liste de courses », « PRO », téléphone… */
export function OriginBadge({ order }: { order: Order }) {
  if (order.customerType === "pro") return <span className="pill pro">PRO</span>;
  if (order.origin === "liste") return <span className="pill teal">Liste de courses</span>;
  if (order.origin === "catalogue") return null;
  return <span className="pill gray">{origins[order.origin]}</span>;
}

/** Carte compacte d'une commande, avec action rapide. */
export function OrderCard({ order, showDay = false }: { order: Order; showDay?: boolean }) {
  const { setStatus } = useOrders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = nextAction[order.status];
  const urgent = isRequest(order);
  const title = order.pro?.company || order.name;
  const quick = !!action && order.status !== "Prête";
  return (
    <article className={`order-card ${urgent ? "urgent" : ""} ${late(order) ? "late" : ""} ${quick ? "has-action" : ""}`}>
      <Link transitionTypes={PUSH} href={`/admin/commandes/${order.id}`} className="order-card-link">
        <div className="order-card-top">
          <span className="order-time">
            <Clock3 size={15} strokeWidth={2.2} />
            {showDay ? `${dayName(order.date)} · ` : ""}
            {order.time ? formatTime(order.time) : "Heure à convenir"}
            {late(order) && <span className="late-flag">En retard</span>}
          </span>
          <StatusPill status={order.status} />
        </div>
        <h3>
          {title} <span className="order-id">#{order.id.replace(/^[A-Z]+-/, "")}</span>
        </h3>
        {order.pro && <p className="order-sub">{order.pro.contactName}</p>}
        <div className="badges">
          <OriginBadge order={order} />
          {order.pro?.slotMode === "flexible" && <span className="pill gray">Créneau flexible</span>}
        </div>
        <ul className="order-lines">
          {order.items.slice(0, 3).map((i, n) => (
            <li key={n}>{itemLabel(i)}</li>
          ))}
          {order.items.length > 3 && <li className="more">+ {order.items.length - 3} autres</li>}
        </ul>
        {order.notes && <p className="order-note">« {order.notes} »</p>}
        <div className="order-card-foot">
          <span>
            {order.items.length} article{order.items.length > 1 ? "s" : ""} · {amountLabel(order.total)}
          </span>
          {!quick && <ChevronRight className="row-chevron" size={18} aria-hidden="true" />}
        </div>
      </Link>
      {quick && action && (
        <button
          type="button"
          className="btn filled small order-quick"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await setStatus(order, action.status);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "…" : shortAction[order.status]}
        </button>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </article>
  );
}
