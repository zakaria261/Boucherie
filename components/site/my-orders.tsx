"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import type { OrderItem, OrderStatus } from "@/lib/types";
import { formatTime, longDate, money } from "@/lib/shop";
import { ORDERS_KEY } from "./checkout";
import { reorderable, useShop } from "./store";

type Summary = {
  token: string;
  id: string;
  status: OrderStatus;
  date: string;
  time: string;
  total: number;
  items: OrderItem[];
};

export function MyOrders() {
  const { products, add, openCart } = useShop();
  const [orders, setOrders] = useState<Summary[] | null>(null);
  useEffect(() => {
    let saved: { token: string }[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    } catch {}
    Promise.all(
      (Array.isArray(saved) ? saved : []).slice(0, 20).map(async ({ token }) => {
        const r = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        return r.ok ? ({ ...(await r.json()), token } as Summary) : null;
      }),
    )
      .then((list) => setOrders(list.filter((o): o is Summary => !!o)))
      .catch(() => setOrders([]));
  }, []);
  if (!orders) return <p className="muted">Chargement…</p>;
  if (!orders.length)
    return (
      <div className="empty">
        <h2>Aucune commande sur cet appareil.</h2>
        <Link className="button primary" href="/boutique">
          Voir la boutique
        </Link>
      </div>
    );
  return (
    <ul className="my-orders">
      {orders.map((o) => {
        const again = o.items.filter((i) => reorderable(products, i));
        return (
          <li key={o.token} className="card">
            <Link href={`/commande/suivi/${o.token}`} className="my-order-link">
              <span>
                <strong>{o.id}</strong>
                <small>
                  Retrait {longDate(o.date)}
                  {o.time ? ` à ${formatTime(o.time)}` : ""} · {money(o.total)}
                </small>
              </span>
              <span className="tag soft">{o.status}</span>
              <ChevronRight size={18} />
            </Link>
            {again.length > 0 && (
              <button
                className="text-button"
                onClick={() => {
                  for (const i of again)
                    add(products.find((p) => p.id === i.id)!, i.grams, i.quantity, i.options);
                  openCart();
                }}
              >
                <RotateCcw size={15} /> Commander à nouveau
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
