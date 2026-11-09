"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { linePrice, money } from "@/lib/shop";
import { ProductCard, useShop } from "./store";
export function ProductDetail({ product: p }: { product: Product }) {
  const { add, products, openCart } = useShop();
  const [grams, setGrams] = useState(500),
    [quantity, setQuantity] = useState(1),
    [added, setAdded] = useState(false);
  const related = products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);
  return (
    <div className="section product-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <span>/</span>
        <Link href="/boutique">La boutique</Link>
        <span>/</span>
        {p.name}
      </div>
      <div className="product-detail">
        <div className="product-detail-photo">
          <img src={p.image} alt={p.name} />
          {p.badge && <span className="detail-badge">{p.badge}</span>}
        </div>
        <div className="product-detail-content">
          <div className="eyebrow">
            {p.category} · LE SAVOIR-FAIRE DE VOTRE ARTISAN
          </div>
          <h1>{p.name}</h1>
          <div className="product-detail-price">
            {money(p.price)} <span>/ kg</span>
          </div>
          <p className="detail-description">{p.description}</p>
          <div className={`availability ${p.available ? "" : "unavailable"}`}>
            <span />
            {p.available
              ? "Disponible à la commande"
              : "Momentanément indisponible"}
          </div>
          <fieldset className="weight-picker">
            <legend>Choisissez votre poids</legend>
            {[250, 500, 1000, 1500, 2000].map((g) => (
              <button
                key={g}
                type="button"
                className={grams === g ? "chosen" : ""}
                aria-pressed={grams === g}
                onClick={() => {
                  setGrams(g);
                  setAdded(false);
                }}
              >
                {g < 1000
                  ? `${g} g`
                  : `${(g / 1000).toLocaleString("fr-FR")} kg`}
              </button>
            ))}
          </fieldset>
          <div className="detail-purchase">
            <div className="quantity">
              <button
                aria-label="Diminuer la quantité"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Augmenter la quantité"
                disabled={quantity >= 20}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button primary"
              disabled={!p.available}
              onClick={() => {
                for (let i = 0; i < quantity; i++) add(p, grams);
                setAdded(true);
              }}
            >
              {added ? <Check size={18} /> : <ShoppingBag size={18} />}{" "}
              {added ? "Ajouté" : "Ajouter"} ·{" "}
              {money(linePrice(p.price, grams, quantity))}
            </button>
          </div>
          {added && (
            <button className="text-link added-link" onClick={openCart}>
              Voir mon panier <ArrowRight size={16} />
            </button>
          )}
          <small className="weight-note">
            Prix estimé selon le poids souhaité. Le montant final dépend du
            poids réellement préparé.
          </small>
          <div className="detail-assurances">
            <span>
              <Store size={18} /> Retrait chez votre artisan à Amiens
            </span>
            <span>
              <UtensilsCrossed size={18} /> Préparation et découpe en boutique
            </span>
          </div>
          <details open>
            <summary>Informations & conseils</summary>
            <p>
              {p.ingredients ||
                "Contactez votre boucher pour connaître les ingrédients, les allergènes et la provenance."}
            </p>
          </details>
          <details>
            <summary>Comment se passe le retrait ?</summary>
            <p>
              Choisissez une date à partir de demain puis envoyez votre panier
              sur WhatsApp. La boucherie reçoit votre commande dans la
              conversation et confirme la disponibilité avant le retrait.
            </p>
          </details>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-products">
          <div className="section-heading">
            <div>
              <div className="eyebrow">POUR COMPLÉTER VOTRE TABLE</div>
              <h2>Vous aimerez aussi.</h2>
            </div>
            <Link className="text-link" href="/boutique">
              Retour au comptoir <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {related.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
