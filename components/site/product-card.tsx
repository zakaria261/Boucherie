"use client";
import Link from "next/link";
import { ViewTransition } from "react";
import { Plus } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { unitShort } from "@/lib/types";
import { formatStock, money, portionLabel, weightsFor } from "@/lib/shop";
import { effectivePrice, useShop } from "./store";
import { Photo } from "./photo";

/** Nom de transition partagé entre la carte et la fiche (photo qui s'agrandit). */
export function morphName(id: string) {
  return `photo-${[...id].map((c) => (/[a-z0-9-]/i.test(c) ? c : c.codePointAt(0)!.toString(36))).join("")}`;
}

export function defaultPortion(p: PublicProduct) {
  const weights = weightsFor(p);
  return weights.includes(500) ? 500 : weights[0];
}

export function Price({ product: p, large }: { product: PublicProduct; large?: boolean }) {
  return (
    <span className={`price ${large ? "large" : ""}`}>
      {p.promo && (
        <s aria-label={`Prix habituel ${money(p.price)}`}>{money(p.price)}</s>
      )}
      <strong className={p.promo ? "promo" : ""}>{money(effectivePrice(p))}</strong>
      <small>{unitShort[p.unit]}</small>
    </span>
  );
}

export function StockNote({ product: p }: { product: PublicProduct }) {
  if (!p.available) return <span className="stock out">Indisponible</span>;
  if (p.stock !== null && p.stock <= 0)
    return <span className="stock out">Épuisé</span>;
  // Quantité affichée uniquement lorsqu'elle est réellement suivie.
  const limits = [p.stock, p.promo?.remaining ?? null].filter(
    (n): n is number => n !== null,
  );
  if (limits.length)
    return (
      <span className="stock low">
        Reste {formatStock(p.unit, Math.min(...limits))}
      </span>
    );
  if (p.readyToday) return <span className="stock ok">Prêt aujourd’hui</span>;
  return <span className="stock ok">Disponible</span>;
}

export function ProductCard({
  product: p,
  morph = false,
}: {
  product: PublicProduct;
  /** Photo partagée avec la fiche produit (une seule carte par produit sur la page). */
  morph?: boolean;
}) {
  const { add } = useShop();
  const href = `/boutique/${encodeURIComponent(p.id)}`;
  const soldOut = !p.available || (p.stock !== null && p.stock <= 0);
  const portion = defaultPortion(p);
  const discount = p.promo
    ? Math.round((1 - p.promo.price / p.price) * 100)
    : 0;
  return (
    <article className="product">
      <Link href={href} className="product-media" tabIndex={-1} aria-hidden="true">
        {morph ? (
          <ViewTransition name={morphName(p.id)} share="morph">
            <Photo src={p.image} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px" />
          </ViewTransition>
        ) : (
          <Photo src={p.image} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px" />
        )}
        <span className="product-tags">
          {discount > 0 && <span className="tag promo">−{discount} %</span>}
          {p.badge && <span className="tag">{p.badge}</span>}
        </span>
      </Link>
      <div className="product-body">
        <span className="product-meta">{p.category}</span>
        <Link className="product-name" href={href}>
          {p.name}
        </Link>
        <StockNote product={p} />
        <div className="product-foot">
          <Price product={p} />
          <button
            className="add-button"
            disabled={soldOut}
            aria-label={`Ajouter ${portionLabel(p.unit, portion)} de ${p.name}`}
            onClick={() => add(p, portion)}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}

/** Carte « Disponible aujourd'hui » avec réservation directe. */
export function TodayCard({ product: p }: { product: PublicProduct }) {
  const { add, openCart } = useShop();
  const portion = defaultPortion(p);
  const soldOut = !p.available || (p.stock !== null && p.stock <= 0);
  return (
    <article className="today-card">
      <Photo src={p.image} sizes="(max-width: 640px) 40vw, 200px" />
      <div>
        <Link className="product-name" href={`/boutique/${encodeURIComponent(p.id)}`}>
          {p.name}
        </Link>
        <StockNote product={p} />
        <div className="product-foot">
          <Price product={p} />
          <button
            className="button small primary"
            disabled={soldOut}
            aria-label={`Réserver ${p.name}`}
            onClick={() => {
              add(p, portion);
              openCart();
            }}
          >
            Réserver
          </button>
        </div>
      </div>
    </article>
  );
}
