"use client";
import Link from "next/link";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { ChevronRight, Clock3, Minus, Plus, ShoppingBag } from "lucide-react";
import type { PublicProduct, Recipe } from "@/lib/types";
import { unitLabels } from "@/lib/types";
import {
  linePrice,
  MAX_QUANTITY,
  money,
  portionLabel,
  weightsFor,
} from "@/lib/shop";
import { effectivePrice, useShop } from "./store";
import { defaultPortion, Price, ProductCard, StockNote, morphName } from "./product-card";
import { Photo } from "./photo";

export function ProductDetail({
  product: p,
  recipes,
}: {
  product: PublicProduct;
  recipes: Recipe[];
}) {
  const { products, add } = useShop();
  const weights = weightsFor(p);
  const [grams, setGrams] = useState(defaultPortion(p)),
    [quantity, setQuantity] = useState(1),
    [options, setOptions] = useState<Record<string, string>>({});
  const soldOut = !p.available || (p.stock !== null && p.stock <= 0);
  // Barre d'achat fixe (mobile) tant que le bouton principal est hors écran.
  const buyRow = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    const el = buyRow.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setBarVisible(!entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-buy-bar", barVisible);
    return () => document.documentElement.removeAttribute("data-buy-bar");
  }, [barVisible]);
  const total = money(linePrice(effectivePrice(p), grams, quantity, p.unit));
  const addToCart = () => add(p, grams, quantity, chosen);
  const similar = products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);
  const chosen = p.preparations
    .map((o) =>
      o.choices.length
        ? options[o.name]
          ? `${o.name} : ${options[o.name]}`
          : ""
        : options[o.name]
          ? o.name
          : "",
    )
    .filter(Boolean);
  const facts = [
    ["Origine", p.origin],
    ["Composition", p.ingredients],
    ["Allergènes", p.allergens],
    ["Conseils de cuisson", p.cooking],
    ["Quantités conseillées", p.servingAdvice],
  ].filter(([, v]) => v);

  return (
    <div className="product-page">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <Link href="/boutique">La boutique</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href={`/boutique?categorie=${encodeURIComponent(p.category)}`}>
          {p.category}
        </Link>
      </nav>
      <div className="product-layout">
        <div className="product-detail-photo">
          <ViewTransition name={morphName(p.id)} share="morph">
            <Photo src={p.image} alt={p.name} sizes="(max-width: 900px) 100vw, 50vw" preload />
          </ViewTransition>
          {p.badge && <span className="tag">{p.badge}</span>}
        </div>
        <div className="product-buy">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="product-detail-price">
            <Price product={p} large />
            {p.promo && (
              <span className="promo-until">
                <Clock3 size={14} /> Offre valable jusqu’au{" "}
                {new Date(p.promo.endsAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            )}
          </div>
          <StockNote product={p} />
          {p.description && <p className="lead">{p.description}</p>}

          <div className="buy-box">
            {weights[0] !== 0 && (
              <fieldset>
                <legend>Poids par portion</legend>
                <div className="choice-row">
                  {weights.map((g) => (
                    <button
                      type="button"
                      key={g}
                      aria-pressed={grams === g}
                      onClick={() => setGrams(g)}
                    >
                      {portionLabel(p.unit, g)}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {p.preparations.map((o) =>
              o.choices.length ? (
                <fieldset key={o.name}>
                  <legend>{o.name}</legend>
                  <div className="choice-row">
                    {o.choices.map((c) => (
                      <button
                        type="button"
                        key={c}
                        aria-pressed={options[o.name] === c}
                        onClick={() =>
                          setOptions((cur) => ({
                            ...cur,
                            [o.name]: cur[o.name] === c ? "" : c,
                          }))
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label className="check-row" key={o.name}>
                  <input
                    type="checkbox"
                    checked={!!options[o.name]}
                    onChange={(e) =>
                      setOptions((cur) => ({
                        ...cur,
                        [o.name]: e.target.checked ? "1" : "",
                      }))
                    }
                  />
                  {o.name}
                </label>
              ),
            )}
            <div className="buy-row" ref={buyRow}>
              <div className="stepper">
                <button
                  type="button"
                  aria-label="Diminuer la quantité"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus size={17} />
                </button>
                <span aria-live="polite" aria-label={`Quantité ${quantity}`}>
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Augmenter la quantité"
                  disabled={quantity >= MAX_QUANTITY}
                  onClick={() =>
                    setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
              <button
                className="button primary grow"
                disabled={soldOut}
                onClick={addToCart}
              >
                <ShoppingBag size={18} />
                Ajouter · {total}
              </button>
            </div>
            <p className="fine">
              Prix {unitLabels[p.unit]}. Le montant définitif est calculé sur
              le poids réellement préparé et réglé en boutique. Une demande
              particulière ? Précisez-la au moment de commander.
            </p>
          </div>

          {facts.length > 0 && (
            <dl className="facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!p.allergens && !p.origin && (
            <p className="fine">
              Origine, composition et allergènes : demandez à votre boucher, il
              vous renseignera au comptoir ou par téléphone.
            </p>
          )}
        </div>
      </div>

      {recipes.length > 0 && (
        <section className="block">
          <h2>Pour le cuisiner</h2>
          <div className="recipe-grid">
            {recipes.map((r) => (
              <Link className="recipe-card" key={r.id} href={`/recettes/${r.id}`}>
                <Photo src={r.image} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px" />
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.servings} pers. · {r.prepMinutes + r.cookMinutes} min
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {similar.length > 0 && (
        <section className="block">
          <h2>Dans le même rayon</h2>
          <div className="product-grid">
            {similar.map((x) => (
              <ProductCard key={x.id} product={x} morph />
            ))}
          </div>
        </section>
      )}
      <div
        className="buy-bar"
        data-visible={barVisible}
        inert={!barVisible}
        aria-hidden={!barVisible}
      >
        <span className="buy-bar-text">
          <small>
            {weights[0] !== 0 ? `${portionLabel(p.unit, grams)} · ` : ""}
            {quantity > 1 ? `${quantity} portions` : "1 portion"}
          </small>
          <strong>{total}</strong>
        </span>
        <button
          type="button"
          className="button primary"
          disabled={soldOut}
          onClick={addToCart}
        >
          <ShoppingBag size={18} />
          {soldOut ? "Indisponible" : "Ajouter au panier"}
        </button>
      </div>
    </div>
  );
}
