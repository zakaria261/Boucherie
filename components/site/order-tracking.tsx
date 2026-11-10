"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Printer, RefreshCw, RotateCcw } from "lucide-react";
import type { OrderItem } from "@/lib/types";
import { reorderable, useShop } from "./store";

/** Actualise le suivi (au retour sur la page et toutes les 30 s) et permet de recommander. */
export function TrackingActions({ items }: { items: OrderItem[] }) {
  const router = useRouter();
  const { products, add, openCart } = useShop();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const again = items.filter((i) => reorderable(products, i));
  return (
    <div className="row-actions center">
      <button className="button outline small" onClick={() => router.refresh()}>
        <RefreshCw size={16} /> Actualiser
      </button>
      {again.length > 0 && (
        <button
          className="button outline small"
          onClick={() => {
            for (const i of again)
              add(products.find((p) => p.id === i.id)!, i.grams, i.quantity, i.options);
            openCart();
          }}
        >
          <RotateCcw size={16} /> Commander à nouveau
        </button>
      )}
      <button className="button outline small" onClick={() => window.print()}>
        <Printer size={16} /> Imprimer
      </button>
    </div>
  );
}
