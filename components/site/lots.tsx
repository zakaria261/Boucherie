"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Minus, Package, Plus, Send, X } from "lucide-react";
import { daysLabel, type Lot, type Marinade } from "@/lib/offers";
import { validEmail, validPhone } from "@/lib/requests";
import { money } from "@/lib/shop";
import { PickupPicker } from "./pickup-picker";
import { attemptKey, Field, rememberOrder } from "./shopping-list-form";
import { useShop } from "./store";

const CLIENT_KEY = "faubourg-client";

export function LotsAndMarinades({
  lots,
  marinades,
  booklet,
}: {
  lots: Lot[];
  marinades: Marinade[];
  /** Carte des marinades à feuilleter. */
  booklet?: React.ReactNode;
}) {
  const [open, setOpen] = useState<Lot | null>(null);
  return (
    <>
      <section className="lots-block" aria-labelledby="lots-titre">
        <h2 id="lots-titre">Nos lots</h2>
        <p className="lots-hint">
          <CalendarClock size={18} aria-hidden="true" /> Commandez la veille pour le lendemain : vos lots sont préparés à
          la commande. Paiement lors du retrait.
        </p>
        <div className="lot-grid">
          {lots.map((lot) => (
            <article className="lot-card" key={lot.id} aria-labelledby={`${lot.id}-nom`}>
              <header>
                <Package size={20} aria-hidden="true" />
                <h3 id={`${lot.id}-nom`}>{lot.name}</h3>
                <strong className="lot-price">{money(lot.price)}</strong>
              </header>
              <ul>
                {lot.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              {(lot.note || lot.days.length > 0) && (
                <p className="lot-note">{lot.note || `Uniquement le ${daysLabel(lot.days)}.`}</p>
              )}
              <button type="button" className="button primary full" onClick={() => setOpen(lot)}>
                Commander ce lot
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="lots-block" aria-labelledby="marinades-titre">
        <h2 id="marinades-titre">Nos marinades</h2>
        <p>Nos viandes sont disponibles avec les marinades suivantes, préparées en boutique. Marinade de qualité supérieure.</p>
        {booklet}
        <div className="marinade-grid">
          {marinades.map((m) => (
            <article className="marinade-card" key={m.id}>
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <dl>
                <div>
                  <dt>Ingrédients</dt>
                  <dd>{m.ingredients || "Communiqués en boutique, sur simple demande."}</dd>
                </div>
                <div>
                  <dt>Allergènes</dt>
                  <dd>{m.allergens || "Liste disponible en boutique : demandez-la à votre boucher."}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {open && <LotOrder lot={open} marinades={marinades} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Volet de commande d'un lot : coordonnées, jour, heure, précisions. */
function LotOrder({ lot, marinades, onClose }: { lot: Lot; marinades: Marinade[]; onClose: () => void }) {
  const router = useRouter();
  const { settings } = useShop();
  const dialog = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [marinade, setMarinade] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
  const [pickup, setPickup] = useState({ date: "", time: "" });
  const [needTime, setNeedTime] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const keyName = `faubourg-lot-cle-${lot.id}`;

  useEffect(() => {
    dialog.current?.showModal();
    try {
      const client = JSON.parse(localStorage.getItem(CLIENT_KEY) || "null");
      if (client && typeof client === "object") {
        const [firstName = "", ...rest] = String(client.name || "").split(" ");
        setForm((f) => ({ ...f, firstName, lastName: rest.join(" "), phone: String(client.phone || ""), email: String(client.email || "") }));
      }
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Indiquez votre prénom.";
    if (!form.lastName.trim()) next.lastName = "Indiquez votre nom.";
    if (!validPhone(form.phone.trim())) next.phone = "Indiquez un numéro de téléphone valide.";
    if (form.email.trim() && !validEmail(form.email.trim())) next.email = "Vérifiez votre adresse e-mail.";
    if (!pickup.date) next.pickup = "Choisissez un jour de retrait.";
    else if (needTime && !pickup.time) next.pickup = "Choisissez une heure de retrait.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setSendError("");
    try {
      const response = await fetch("/api/lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey: attemptKey(keyName), lotId: lot.id, quantity, marinade, ...form, ...pickup }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.token) throw new Error(result.error || "Votre commande n’a pas pu être enregistrée. Réessayez.");
      rememberOrder(result.token, result.id);
      try {
        localStorage.setItem(CLIENT_KEY, JSON.stringify({ name: `${form.firstName} ${form.lastName}`, phone: form.phone, email: form.email }));
        sessionStorage.removeItem(keyName);
      } catch {}
      router.push(`/commande/suivi/${result.token}?confirmation=1`);
    } catch (err) {
      setSendError(
        err instanceof TypeError ? "Connexion impossible. Réessayez dans un instant : la commande ne sera pas enregistrée deux fois." : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="lot-dialog" aria-labelledby="lot-commande-titre" onClose={onClose}>
      <form className="request-form" onSubmit={submit} noValidate>
        <header className="lot-dialog-head">
          <div>
            <span className="eyebrow">Commander</span>
            <h2 id="lot-commande-titre">{lot.name}</h2>
            <p className="muted small">{lot.items.join(" · ")}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>
            <X size={22} />
          </button>
        </header>

        <div className="lot-qty">
          <span>Nombre de lots</span>
          <div className="stepper">
            <button type="button" aria-label="Un lot de moins" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)}>
              <Minus size={17} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" aria-label="Un lot de plus" disabled={quantity >= 10} onClick={() => setQuantity((q) => q + 1)}>
              <Plus size={17} />
            </button>
          </div>
          <strong>{money(lot.price * quantity)}</strong>
        </div>

        {lot.marinade && marinades.length > 0 && (
          <div className="field-wrap">
            <label htmlFor="lot-marinade">Marinade souhaitée pour les produits marinés</label>
            <select id="lot-marinade" value={marinade} onChange={(e) => setMarinade(e.target.value)}>
              <option value="">Au choix du boucher</option>
              {marinades.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field-pair">
          <Field id="lot-prenom" label="Prénom" error={errors.firstName}>
            <input autoComplete="given-name" maxLength={60} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field id="lot-nom" label="Nom" error={errors.lastName}>
            <input autoComplete="family-name" maxLength={60} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field id="lot-telephone" label="Téléphone" error={errors.phone}>
          <input type="tel" inputMode="tel" autoComplete="tel" maxLength={25} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field id="lot-email" label="E-mail" optional error={errors.email}>
          <input type="email" inputMode="email" autoComplete="email" maxLength={150} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>

        <PickupPicker
          date={pickup.date}
          time={pickup.time}
          phone={settings.phone}
          days={lot.days}
          onSlots={setNeedTime}
          onChange={(date, time) => setPickup({ date, time })}
        />
        {lot.days.length > 0 && <p className="muted small">Ce lot est disponible uniquement le {daysLabel(lot.days)}.</p>}
        {errors.pickup && <p className="form-error" role="alert">{errors.pickup}</p>}

        <label className="field-wrap">
          <span>Précisions (facultatif)</span>
          <textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        <p className="commercial-note">
          Commande soumise à la confirmation de la boucherie. Paiement lors du retrait, en boutique.
        </p>
        {sendError && <p className="form-error" role="alert">{sendError}</p>}
        <button className="button primary full" disabled={busy} aria-busy={busy}>
          {busy ? "Envoi en cours…" : (
            <>
              <Send size={17} /> Envoyer ma commande · {money(lot.price * quantity)}
            </>
          )}
        </button>
      </form>
    </dialog>
  );
}
