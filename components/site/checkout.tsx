"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ShoppingBag, Store } from "lucide-react";
import { CartLines, effectivePrice, useShop } from "./store";
import { cartKey, formatTime, longDate, money, parisNow, addDays } from "@/lib/shop";

type Slots = {
  slotsEnabled: boolean;
  dates: { date: string; slots: { time: string; full: boolean }[] }[];
};
const CLIENT_KEY = "faubourg-client";
export const ORDERS_KEY = "faubourg-orders";

function dayLabel(date: string) {
  const today = parisNow().date;
  if (date === today) return "Aujourd’hui";
  if (date === addDays(today, 1)) return "Demain";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function Checkout({ customerWhatsapp }: { customerWhatsapp: boolean }) {
  const { cart, products, total, clear, settings } = useShop();
  const router = useRouter();
  const [slots, setSlots] = useState<Slots | null>(null),
    [slotsError, setSlotsError] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [client, setClient] = useState({ name: "", phone: "", email: "" }),
    [remember, setRemember] = useState(true),
    [optIn, setOptIn] = useState(false),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const sameDay = cart.length > 0 && cart.every(
    (i) => products.find((p) => p.id === i.id)?.readyToday,
  );
  const signature = useMemo(
    () => cart.map(cartKey).sort().join(","),
    [cart],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CLIENT_KEY) || "null");
      if (saved && typeof saved === "object")
        setClient({
          name: String(saved.name || ""),
          phone: String(saved.phone || ""),
          email: String(saved.email || ""),
        });
    } catch {}
  }, []);

  useEffect(() => {
    if (!cart.length) return;
    let cancelled = false;
    setSlotsError("");
    fetch(`/api/creneaux${sameDay ? "?jourMeme=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Slots) => {
        if (cancelled) return;
        setSlots(data);
        setDate((current) =>
          data.dates.some((d) => d.date === current)
            ? current
            : data.dates[0]?.date || "",
        );
      })
      .catch(() => {
        if (!cancelled)
          setSlotsError(
            "Impossible de charger les créneaux. Vérifiez votre connexion puis rechargez la page.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [sameDay, cart.length]);

  const day = slots?.dates.find((d) => d.date === date);
  useEffect(() => {
    if (day && !day.slots.some((s) => s.time === time && !s.full)) setTime("");
  }, [day, time]);

  /**
   * Identifiant de la tentative de commande : conservé tant que le panier
   * ne change pas, il empêche les doublons en cas de double appui ou de
   * nouvel essai après une coupure réseau.
   */
  function requestKey() {
    const storageKey = `faubourg-request:${signature}`;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return saved;
      const key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
      return key;
    } catch {
      return crypto.randomUUID();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!date) return setError("Choisissez un jour de retrait.");
    if (slots?.slotsEnabled && !time)
      return setError("Choisissez un créneau de retrait.");
    setBusy(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: requestKey(),
          ...client,
          whatsappOptIn: optIn,
          date,
          time,
          notes,
          items: cart.map((i) => ({
            ...i,
            price: effectivePrice(products.find((p) => p.id === i.id)!),
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.error ||
            "La commande n’a pas pu être enregistrée. Réessayez dans un instant.",
        );
      try {
        if (remember) localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
        else localStorage.removeItem(CLIENT_KEY);
        const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
        localStorage.setItem(
          ORDERS_KEY,
          JSON.stringify(
            [
              { id: result.id, token: result.token, at: new Date().toISOString() },
              ...(Array.isArray(orders) ? orders : []).filter(
                (o: { token?: string }) => o.token !== result.token,
              ),
            ].slice(0, 20),
          ),
        );
        sessionStorage.removeItem(`faubourg-request:${signature}`);
      } catch {}
      clear();
      router.push(`/commande/suivi/${result.token}?confirmation=1`);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Connexion impossible : votre commande n’a pas été envoyée. Vérifiez votre réseau puis réessayez, elle ne sera pas enregistrée deux fois."
          : (err as Error).message;
      setError(message);
      setBusy(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (!cart.length)
    return (
      <div className="checkout narrow">
        <div className="empty">
          <ShoppingBag size={36} />
          <h1>Votre panier est vide.</h1>
          <p>Choisissez vos produits, nous les préparons pour votre passage.</p>
          <Link className="button primary" href="/boutique">
            Voir la boutique <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );

  return (
    <form className="checkout" onSubmit={submit} noValidate={false}>
      <header className="page-head">
        <span className="eyebrow">Click &amp; Collect</span>
        <h1>Votre commande</h1>
        <p>
          Pas de compte à créer, pas de paiement en ligne : vous réglez au
          comptoir en récupérant votre commande.
        </p>
      </header>
      <div className="checkout-grid">
        <div className="checkout-steps">
          <section className="card">
            <h2>
              <span className="step">1</span> Vos coordonnées
            </h2>
            <label>
              Nom complet
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                minLength={8}
                maxLength={25}
                value={client.phone}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
              />
              <small>Pour vous prévenir si un produit manque.</small>
            </label>
            <label>
              E-mail <span className="optional">facultatif</span>
              <input
                type="email"
                autoComplete="email"
                maxLength={150}
                value={client.email}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Mémoriser mes coordonnées sur cet appareil
            </label>
            {customerWhatsapp && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                />
                Recevoir le suivi de ma commande par WhatsApp
              </label>
            )}
          </section>

          <section className="card">
            <h2>
              <span className="step">2</span> Votre retrait
            </h2>
            <div className="pickup-place">
              <Store size={20} />
              <span>
                <strong>{settings.name}</strong>
                <small>{settings.address}</small>
              </span>
            </div>
            {slotsError && <p className="form-error">{slotsError}</p>}
            {!slots && !slotsError && <p className="muted">Chargement des créneaux…</p>}
            {slots && !slots.dates.length && (
              <p className="form-error">
                Aucun créneau n’est disponible pour le moment. Appelez-nous
                {settings.phone ? ` au ${settings.phone}` : ""} pour organiser
                votre retrait.
              </p>
            )}
            {slots && slots.dates.length > 0 && (
              <>
                <fieldset>
                  <legend>Jour</legend>
                  <div className="day-picker">
                    {slots.dates.map((d) => (
                      <button
                        type="button"
                        key={d.date}
                        aria-pressed={date === d.date}
                        aria-label={longDate(d.date)}
                        onClick={() => setDate(d.date)}
                      >
                        <small>{dayLabel(d.date)}</small>
                        <strong>{Number(d.date.slice(8))}</strong>
                        <small>
                          {new Date(`${d.date}T12:00:00Z`).toLocaleDateString(
                            "fr-FR",
                            { month: "short", timeZone: "UTC" },
                          )}
                        </small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {slots.slotsEnabled && day && (
                  <fieldset>
                    <legend>Heure de passage · {longDate(day.date)}</legend>
                    <div className="slot-grid">
                      {day.slots.map((s) => (
                        <button
                          type="button"
                          key={s.time}
                          disabled={s.full}
                          aria-pressed={time === s.time}
                          onClick={() => setTime(s.time)}
                        >
                          {formatTime(s.time)}
                          {s.full && <small>Complet</small>}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {!slots.slotsEnabled && (
                  <p className="muted">
                    L’heure de passage sera confirmée par la boucherie.
                  </p>
                )}
                <p className="fine">
                  {sameDay && settings.pickup.sameDay
                    ? "Tous vos produits sont prêts aujourd’hui : le retrait le jour même est possible."
                    : settings.pickup.leadDays === 1
                      ? "Commandez la veille pour le lendemain : nous préparons tout à la commande."
                      : `Nous avons besoin de ${settings.pickup.leadDays} jours pour préparer votre commande.`}
                </p>
              </>
            )}
          </section>

          <section className="card">
            <h2>
              <span className="step">3</span> Une précision ?
            </h2>
            <label>
              Instructions pour votre boucher{" "}
              <span className="optional">facultatif</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Découpe, épaisseur, nombre de convives…"
              />
            </label>
          </section>
        </div>

        <aside className="card summary">
          <h2>Récapitulatif</h2>
          <CartLines />
          <div className="cart-total">
            <span>Total estimé</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="fine">
            Le prix final dépend du poids réellement préparé. Aucun paiement en
            ligne : vous réglez en boutique au retrait.
          </p>
          {error && (
            <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </p>
          )}
          <button
            className="button primary full"
            type="submit"
            disabled={
              busy ||
              cart.some((i) => !products.find((p) => p.id === i.id)?.available)
            }
          >
            {busy ? (
              "Enregistrement…"
            ) : (
              <>
                <Check size={18} /> Confirmer ma commande
              </>
            )}
          </button>
          {date && (
            <p className="summary-pickup">
              Retrait {longDate(date)}
              {time ? ` à ${formatTime(time)}` : ""}
            </p>
          )}
        </aside>
      </div>
    </form>
  );
}
