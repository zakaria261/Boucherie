"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MessageCircle, ShoppingBag, Store } from "lucide-react";
import { CartLines, useShop } from "./store";
import { linePrice, money, tomorrow } from "@/lib/shop";
import { clickCollectWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
export function Checkout() {
  const { cart, products, settings } = useShop();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const total = cart.reduce(
    (sum, i) =>
      sum +
      linePrice(
        products.find((p) => p.id === i.id)!.price,
        i.grams,
        i.quantity,
      ),
    0,
  );
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(e.currentTarget);
    const link = whatsappLink(
      settings.whatsapp,
      clickCollectWhatsAppMessage({
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        date: new Date(
          `${String(form.get("date"))}T12:00:00`,
        ).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        notes: String(form.get("notes") || ""),
        total: money(total),
        items: cart.map((item) => {
          const product = products.find((p) => p.id === item.id)!;
          return `${item.quantity} × ${product.name} — ${item.grams} g — ${money(
            linePrice(product.price, item.grams, item.quantity),
          )}`;
        }),
      }),
    );
    if (!link) {
      setError(
        "La commande WhatsApp n’est pas encore activée par la boucherie. Réessayez dans quelques instants.",
      );
      return;
    }
    setBusy(true);
    window.location.assign(link);
  }
  return (
    <div className="section checkout-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <span>/</span>Votre commande
      </div>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">BIENTÔT DANS VOTRE ASSIETTE</div>
          <h1>
            Votre marché.
            <br />
            <em>Prêt à être préparé.</em>
          </h1>
        </div>
        <Link href="/boutique" className="text-link">
          Continuer mes achats <ArrowRight size={15} />
        </Link>
      </div>
      {!cart.length ? (
        <div className="empty">
          <ShoppingBag size={45} />
          <h2>Votre panier attend vos envies.</h2>
          <Link className="button primary" href="/boutique">
            Faire mon marché <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <form onSubmit={submit} className="checkout-form checkout-card">
            <div className="checkout-step">
              <span>01</span>
              <h2>Votre commande WhatsApp</h2>
            </div>
            <div className="whatsapp-order-intro">
              <MessageCircle size={23} />
              <p>
                Remplissez ces quelques informations. WhatsApp s’ouvrira avec
                votre commande complète, prête à être envoyée à votre boucher.
              </p>
            </div>
            <label>
              Nom complet
              <input
                autoComplete="name"
                required
                name="name"
                maxLength={100}
                minLength={2}
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                name="phone"
                minLength={8}
                maxLength={25}
              />
            </label>
            <div className="checkout-step">
              <span>02</span>
              <h2>Votre retrait</h2>
            </div>
            <div className="pickup-location">
              <Store size={25} />
              <div>
                <strong>À la Boucherie du Faubourg</strong>
                <span>{settings.address}</span>
              </div>
            </div>
            <label>
              Date souhaitée
              <input
                type="date"
                required
                name="date"
                min={tomorrow()}
                defaultValue={tomorrow()}
              />
            </label>
            <p>
              Commandez la veille pour le lendemain. La date et le créneau
              seront confirmés par votre boucher.
            </p>
            <label>
              Une précision pour votre artisan ?
              <textarea
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="Découpe, préparation, précisions…"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button whatsapp-button full"
              type="submit"
              disabled={
                busy ||
                cart.some(
                  (i) => !products.find((p) => p.id === i.id)?.available,
                )
              }
            >
              {busy ? "Ouverture de WhatsApp…" : "Commander sur WhatsApp"}{" "}
              <MessageCircle size={18} />
            </button>
            <p className="checkout-reassurance">
              <MessageCircle size={14} /> Votre message est envoyé directement à
              la boucherie dans WhatsApp. Aucun paiement en ligne.
            </p>
          </form>
          <aside className="order-summary checkout-card">
            <div className="eyebrow">VOTRE SÉLECTION</div>
            <h2>Les bonnes choses.</h2>
            <CartLines />
            <div className="order-total">
              <span>Total estimé</span>
              <strong>{money(total)}</strong>
            </div>
            <p>
              Le prix définitif dépend du poids préparé. Les disponibilités
              seront confirmées par la boucherie.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
