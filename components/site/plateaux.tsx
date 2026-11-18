"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Minus, Plus, Send, Users, Wallet, X } from "lucide-react";
import { BUDGET_RANGE, estimateLabel, MAX_PEOPLE, type Plateau } from "@/lib/plateaux";
import type { Marinade } from "@/lib/offers";
import { validEmail, validPhone } from "@/lib/requests";
import { Photo } from "./photo";
import { PickupPicker } from "./pickup-picker";
import { attemptKey, Field, rememberOrder } from "./shopping-list-form";
import { useShop } from "./store";

const CLIENT_KEY = "faubourg-client";

/** Plateaux à partager : présentation et commande (personnes ou budget). */
export function PlateauxView({ plateaux, marinades }: { plateaux: Plateau[]; marinades: Marinade[] }) {
  const [open, setOpen] = useState<Plateau | null>(null);
  return (
    <>
      <p className="lots-hint">
        <CalendarClock size={18} aria-hidden="true" /> Commandez au minimum la veille pour le lendemain. Indiquez le
        nombre de personnes ou votre budget : nous composons le plateau et vous confirmons le prix.
      </p>
      <div className="plateau-grid">
        {plateaux.map((p) => (
          <article className="plateau-card" key={p.id} aria-labelledby={`${p.id}-nom`}>
            <div className="plateau-media">
              <Photo src={p.image} alt={p.name} sizes="(min-width: 1000px) 400px, (min-width: 640px) 50vw, 100vw" />
            </div>
            <div className="plateau-body">
              <h3 id={`${p.id}-nom`}>{p.name}</h3>
              {p.options.length > 0 && (
                <p className="plateau-options">{p.options.join(" ou ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</p>
              )}
              <p>{p.description}</p>
              <p className="plateau-portion">
                <Users size={16} aria-hidden="true" /> {p.portion}
              </p>
              <button type="button" className="button primary full" onClick={() => setOpen(p)}>
                Commander ce plateau
              </button>
            </div>
          </article>
        ))}
      </div>
      {open && <PlateauOrder plateau={open} marinades={marinades} onClose={() => setOpen(null)} />}
    </>
  );
}

function PlateauOrder({ plateau, marinades, onClose }: { plateau: Plateau; marinades: Marinade[]; onClose: () => void }) {
  const router = useRouter();
  const { settings } = useShop();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"people" | "budget">("people");
  const [people, setPeople] = useState(6);
  const [budget, setBudget] = useState("");
  const [option, setOption] = useState(plateau.options[0] || "");
  const [marinade, setMarinade] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
  const [pickup, setPickup] = useState({ date: "", time: "" });
  const [needTime, setNeedTime] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const keyName = `faubourg-plateau-cle-${plateau.id}`;
  const marinated = !!plateau.marinatedOption && option === plateau.marinatedOption;

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
    const amount = Number(budget.replace(",", "."));
    if (mode === "budget" && (!Number.isFinite(amount) || amount < BUDGET_RANGE[0] || amount > BUDGET_RANGE[1]))
      next.budget = `Indiquez un budget entre ${BUDGET_RANGE[0]} et ${BUDGET_RANGE[1]} €.`;
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
      const response = await fetch("/api/plateau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: attemptKey(keyName),
          plateauId: plateau.id,
          mode,
          people,
          budget,
          option,
          marinade: marinated ? marinade : "",
          ...form,
          ...pickup,
        }),
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
    <dialog ref={dialog} className="lot-dialog" aria-labelledby="plateau-commande-titre" onClose={onClose}>
      <form className="request-form" onSubmit={submit} noValidate>
        <header className="lot-dialog-head">
          <div>
            <span className="eyebrow">Plateau à partager</span>
            <h2 id="plateau-commande-titre">{plateau.name}</h2>
            <p className="muted small">{plateau.portion}.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>
            <X size={22} />
          </button>
        </header>

        {plateau.options.length > 0 && (
          <fieldset className="plateau-choice">
            <legend>Version</legend>
            <div className="choice-row">
              {plateau.options.map((o) => (
                <button key={o} type="button" aria-pressed={option === o} onClick={() => setOption(o)}>
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {marinated && marinades.length > 0 && (
          <div className="field-wrap">
            <label htmlFor="plateau-marinade">Marinade souhaitée</label>
            <select id="plateau-marinade" value={marinade} onChange={(e) => setMarinade(e.target.value)}>
              <option value="">Au choix du boucher</option>
              {marinades.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="plateau-choice">
          <legend>Pour combien ?</legend>
          <div className="choice-row">
            <button type="button" aria-pressed={mode === "people"} onClick={() => setMode("people")}>
              <Users size={16} aria-hidden="true" /> Personnes
            </button>
            <button type="button" aria-pressed={mode === "budget"} onClick={() => setMode("budget")}>
              <Wallet size={16} aria-hidden="true" /> Budget
            </button>
          </div>
          {mode === "people" ? (
            <div className="lot-qty">
              <span>Personnes</span>
              <div className="stepper">
                <button type="button" aria-label="Une personne de moins" disabled={people <= 1} onClick={() => setPeople((n) => n - 1)}>
                  <Minus size={17} />
                </button>
                <span aria-live="polite">{people}</span>
                <button type="button" aria-label="Une personne de plus" disabled={people >= MAX_PEOPLE} onClick={() => setPeople((n) => n + 1)}>
                  <Plus size={17} />
                </button>
              </div>
              <strong className="plateau-estimate">{estimateLabel(plateau, people)}</strong>
            </div>
          ) : (
            <Field id="plateau-budget" label="Budget (€)" error={errors.budget}>
              <input
                inputMode="decimal"
                placeholder="Ex. 80"
                maxLength={8}
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d,.]/g, ""))}
              />
            </Field>
          )}
        </fieldset>

        <div className="field-pair">
          <Field id="plateau-prenom" label="Prénom" error={errors.firstName}>
            <input autoComplete="given-name" maxLength={60} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field id="plateau-nom" label="Nom" error={errors.lastName}>
            <input autoComplete="family-name" maxLength={60} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field id="plateau-telephone" label="Téléphone" error={errors.phone}>
          <input type="tel" inputMode="tel" autoComplete="tel" maxLength={25} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field id="plateau-email" label="E-mail" optional error={errors.email}>
          <input type="email" inputMode="email" autoComplete="email" maxLength={150} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>

        <PickupPicker
          date={pickup.date}
          time={pickup.time}
          phone={settings.phone}
          fromTomorrow
          onSlots={setNeedTime}
          onChange={(date, time) => setPickup({ date, time })}
        />
        {errors.pickup && <p className="form-error" role="alert">{errors.pickup}</p>}

        <label className="field-wrap">
          <span>Précisions (facultatif)</span>
          <textarea
            rows={2}
            maxLength={1000}
            placeholder="Allergies, enfants, présentation souhaitée…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        <p className="commercial-note">
          Le prix vous est confirmé par la boucherie avant la préparation. Paiement lors du retrait, en boutique.
        </p>
        {sendError && <p className="form-error" role="alert">{sendError}</p>}
        <button className="button primary full" disabled={busy} aria-busy={busy}>
          {busy ? "Envoi en cours…" : (
            <>
              <Send size={17} /> Envoyer ma demande
            </>
          )}
        </button>
      </form>
    </dialog>
  );
}
