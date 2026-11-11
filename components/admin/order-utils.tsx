"use client";
import Link from "next/link";
import { useState } from "react";
import { Clock3 } from "lucide-react";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { formatTime, longDate, money, parisNow, portionLabel, addDays } from "@/lib/shop";
import { PUSH, StatusPill } from "./ui";
import { useOrders } from "./shell";

export const nextAction: Partial<
  Record<OrderStatus, { label: string; status: OrderStatus }>
> = {
  Nouvelle: { label: "Accepter la commande", status: "Confirmée" },
  Confirmée: { label: "Commencer la préparation", status: "En préparation" },
  "En préparation": { label: "Marquer comme prête", status: "Prête" },
  Prête: { label: "Marquer comme retirée", status: "Retirée" },
};
export const shortAction: Partial<Record<OrderStatus, string>> = {
  Nouvelle: "Accepter",
  Confirmée: "Préparer",
  "En préparation": "Prête",
  Prête: "Retirée",
};

export const itemLine = (i: OrderItem) =>
  `${i.quantity > 1 ? `${i.quantity} × ` : ""}${portionLabel(i.unit, i.grams)} ${i.name}`;

export function dayName(date: string) {
  const today = parisNow().date;
  if (date === today) return "Aujourd’hui";
  if (date === addDays(today, 1)) return "Demain";
  if (date === addDays(today, -1)) return "Hier";
  return longDate(date).replace(/^./, (c) => c.toUpperCase());
}

export const pickupKey = (o: Order) => `${o.date} ${o.time || "99:99"}`;
export const byPickup = (a: Order, b: Order) =>
  pickupKey(a).localeCompare(pickupKey(b));

export const active = (o: Order) => o.status !== "Retirée" && o.status !== "Annulée";

/** Carte compacte d'une commande, avec action rapide. */
export function OrderCard({ order, showDay = false }: { order: Order; showDay?: boolean }) {
  const { setStatus } = useOrders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = nextAction[order.status];
  const urgent = order.status === "Nouvelle";
  return (
    <article className={`order-card ${urgent ? "urgent" : ""}`}>
      <Link transitionTypes={PUSH} href={`/admin/commandes/${order.id}`} className="order-card-link">
        <div className="order-card-top">
          <span className="order-time">
            <Clock3 size={15} strokeWidth={2.2} />
            {showDay ? `${dayName(order.date)} · ` : ""}
            {order.time ? formatTime(order.time) : "Heure à convenir"}
          </span>
          <StatusPill status={order.status} />
        </div>
        <h3>
          {order.name} <span className="order-id">#{order.id.replace("FB-", "")}</span>
        </h3>
        <ul className="order-lines">
          {order.items.slice(0, 3).map((i) => (
            <li key={`${i.id}-${i.grams}-${i.options.join()}`}>{itemLine(i)}</li>
          ))}
          {order.items.length > 3 && <li className="more">+ {order.items.length - 3} autres</li>}
        </ul>
        {order.notes && <p className="order-note">« {order.notes} »</p>}
        <div className="order-card-foot">
          <span>
            {order.items.length} produit{order.items.length > 1 ? "s" : ""} · {money(order.total)}
          </span>
          <span className="link-text">Voir la commande</span>
        </div>
      </Link>
      {action && order.status !== "Prête" && (
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
