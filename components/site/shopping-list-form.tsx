"use client";
import { useRouter } from "next/navigation";
import { cloneElement, useEffect, useRef, useState } from "react";
import { ArrowRight, NotebookPen, Pencil, Send } from "lucide-react";
import { parseFreeItems, validEmail, validPhone } from "@/lib/requests";
import { formatTime, longDate } from "@/lib/shop";
import { blank, draftQuantity, emptyItem, ListEditor, serializeItems, type DraftItem } from "./list-editor";
import { PickupPicker } from "./pickup-picker";
import { ORDERS_KEY } from "./checkout";
import { useShop } from "./store";

const DRAFT_KEY = "faubourg-liste-brouillon";
const KEY_KEY = "faubourg-liste-cle";
const CLIENT_KEY = "faubourg-client";

export const COMMERCIAL_TEXT =
  "Les produits sont soumis à disponibilité. Les prix et le montant final seront confirmés par la boucherie selon les articles et les poids préparés. Nous vous contacterons si un produit est indisponible ou si une précision est nécessaire. Paiement lors du retrait.";

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  notes: string;
  items: DraftItem[];
};
const empty: Draft = { firstName: "", lastName: "", phone: "", email: "", date: "", time: "", notes: "", items: [emptyItem()] };

const ADDED_KEY = "faubourg-liste-ajout";

const readAdded = (): string[] => {
  const raw = sessionStorage.getItem(ADDED_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(String) : [raw];
  } catch {
    return [raw];
  }
};

/**
 * Ajoute un article (guide des morceaux, catalogue des fêtes) au brouillon de
 * la liste, sans toucher aux articles déjà saisis. Rien n'est envoyé : le
 * client complète la quantité et l'unité, puis valide lui-même sa demande.
 */
export function requestFromGuide(name: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") as Partial<Draft> | null;
    const items = (saved?.items || []).filter((i) => !blank(i));
    if (!items.some((i) => i.name.trim().toLowerCase() === name.toLowerCase()))
      items.push({ ...emptyItem(), name });
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...empty, ...saved, items }));
    const added = readAdded().filter((n) => n !== name);
    sessionStorage.setItem(ADDED_KEY, JSON.stringify([...added, name]));
  } catch {}
}

/** Retire de la liste un article ajouté depuis le catalogue. */
export function removeFromList(name: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") as Partial<Draft> | null;
    if (!saved?.items) return;
    const items = saved.items.filter((i) => i.name.trim().toLowerCase() !== name.toLowerCase());
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...saved, items: items.length ? items : [emptyItem()] }));
    const added = readAdded().filter((n) => n !== name);
    if (added.length) sessionStorage.setItem(ADDED_KEY, JSON.stringify(added));
    else sessionStorage.removeItem(ADDED_KEY);
  } catch {}
}

/** Noms des articles déjà présents dans le brouillon de la liste. */
export function listNames(): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") as Partial<Draft> | null;
    return (saved?.items || []).map((i) => i.name.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Mémorise un suivi dans « Mes commandes » (sur cet appareil uniquement). */
export function rememberOrder(token: string, id: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const list = Array.isArray(saved) ? saved.filter((o: { token: string }) => o.token !== token) : [];
    localStorage.setItem(ORDERS_KEY, JSON.stringify([{ token, id }, ...list].slice(0, 30)));
  } catch {}
}

/** Clé d'idempotence d'une tentative d'envoi, gardée jusqu'au succès. */
export function attemptKey(storageKey: string) {
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

export function ShoppingListForm() {
  const router = useRouter();
  const { settings } = useShop();
  const [draft, setDraft] = useState<Draft>(empty);
  const [step, setStep] = useState<"saisie" | "recap">("saisie");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [needTime, setNeedTime] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [addedNotice, setAddedNotice] = useState<string[]>([]);
  const loaded = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  // Brouillon conservé pendant la session : une erreur ou un retour arrière
  // ne fait jamais perdre la saisie.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      const client = JSON.parse(localStorage.getItem(CLIENT_KEY) || "null");
      if (saved && Array.isArray(saved.items) && saved.items.length) setDraft({ ...empty, ...saved });
      const added = readAdded();
      if (added.length) {
        sessionStorage.removeItem(ADDED_KEY);
        setAddedNotice(added);
      }
      else if (client && typeof client === "object") {
        const [firstName = "", ...rest] = String(client.name || "").split(" ");
        setDraft((d) => ({ ...d, firstName, lastName: rest.join(" "), phone: String(client.phone || ""), email: String(client.email || "") }));
      }
    } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const filled = draft.items.filter((i) => !blank(i));

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.firstName.trim()) next.firstName = "Indiquez votre prénom.";
    if (!draft.lastName.trim()) next.lastName = "Indiquez votre nom.";
    if (!validPhone(draft.phone.trim())) next.phone = "Indiquez un numéro de téléphone valide.";
    if (draft.email.trim() && !validEmail(draft.email.trim())) next.email = "Vérifiez votre adresse e-mail.";
    if (!draft.date) next.pickup = "Choisissez une date de récupération.";
    else if (needTime && !draft.time) next.pickup = "Choisissez une heure de récupération.";
    const indexes = draft.items.map((item, i) => (blank(item) ? -1 : i)).filter((i) => i >= 0);
    const result = parseFreeItems(serializeItems(indexes.map((i) => draft.items[i]), false));
    const lineErrors: Record<number, string> = {};
    for (const [k, v] of Object.entries(result.errors)) lineErrors[indexes[Number(k)]] = v;
    if (result.error) next.items = "Ajoutez au moins un article complet : désignation, quantité et unité.";
    setErrors(next);
    setItemErrors(lineErrors);
    return !Object.keys(next).length && !Object.keys(lineErrors).length;
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true], .field-error, .form-error")?.scrollIntoView({ block: "center" }));
      return;
    }
    // Les lignes laissées vides ne sont pas envoyées.
    set({ items: filled });
    setStep("recap");
    top.current?.scrollIntoView({ block: "start" });
  }

  async function send() {
    if (busy) return;
    setBusy(true);
    setSendError("");
    try {
      const response = await fetch("/api/liste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: attemptKey(KEY_KEY),
          firstName: draft.firstName,
          lastName: draft.lastName,
          phone: draft.phone,
          email: draft.email,
          date: draft.date,
          time: draft.time,
          notes: draft.notes,
          items: serializeItems(filled, false),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.token)
        throw new Error(result.error || "Votre demande n’a pas pu être enregistrée. Votre saisie est conservée : réessayez.");
      rememberOrder(result.token, result.id);
      try {
        localStorage.setItem(CLIENT_KEY, JSON.stringify({ name: `${draft.firstName} ${draft.lastName}`, phone: draft.phone, email: draft.email }));
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(KEY_KEY);
      } catch {}
      router.push(`/commande/suivi/${result.token}?confirmation=1`);
    } catch (e) {
      setSendError(
        e instanceof TypeError
          ? "Connexion impossible. Votre saisie est conservée : réessayez dans un instant, sans risque de doublon."
          : (e as Error).message,
      );
      setBusy(false);
    }
  }

  if (step === "recap")
    return (
      <div ref={top} className="list-recap" tabIndex={-1}>
        <article className="paper-note" aria-label="Récapitulatif de votre liste">
          <header>
            <NotebookPen size={22} />
            <div>
              <strong>Votre liste de courses</strong>
              <small>
                {draft.firstName} {draft.lastName} · {draft.phone}
                {draft.email ? ` · ${draft.email}` : ""}
              </small>
            </div>
          </header>
          <p className="paper-slot">
            Retrait {longDate(draft.date)}
            {draft.time ? ` à ${formatTime(draft.time)}` : ""}
          </p>
          <ul>
            {filled.map((i) => (
              <li key={i.key}>
                <span>
                  <strong>{i.name}</strong>
                  {i.note && <small>{i.note}</small>}
                </span>
                <b>{draftQuantity(i)}</b>
              </li>
            ))}
          </ul>
          {draft.notes && (
            <p className="paper-notes">
              <strong>Instructions :</strong> {draft.notes}
            </p>
          )}
        </article>
        <p className="commercial-note">{COMMERCIAL_TEXT}</p>
        {sendError && (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button outline" disabled={busy} onClick={() => setStep("saisie")}>
            <Pencil size={17} /> Modifier
          </button>
          <button type="button" className="button primary grow" disabled={busy} aria-busy={busy} onClick={() => void send()}>
            {busy ? (
              "Envoi en cours…"
            ) : (
              <>
                <Send size={17} /> Envoyer ma demande de commande
              </>
            )}
          </button>
        </div>
      </div>
    );

  return (
    <div ref={top} tabIndex={-1}>
    <form className="request-form" onSubmit={review} noValidate>
      <section className="card">
        <h2>
          <span className="step">1</span> Vos coordonnées
        </h2>
        <div className="field-pair">
          <Field id="firstName" label="Prénom" error={errors.firstName}>
            <input autoComplete="given-name" value={draft.firstName} maxLength={60} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field id="lastName" label="Nom" error={errors.lastName}>
            <input autoComplete="family-name" value={draft.lastName} maxLength={60} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>
        </div>
        <Field id="phone" label="Téléphone" error={errors.phone} hint="Pour vous joindre si un produit manque ou si une précision est nécessaire.">
          <input type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} maxLength={25} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field id="email" label="E-mail" optional error={errors.email}>
          <input type="email" inputMode="email" autoComplete="email" value={draft.email} maxLength={150} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </section>

      <section className="card">
        <h2>
          <span className="step">2</span> Votre liste
        </h2>
        {addedNotice.length > 0 && (
          <p className="added-notice" role="status">
            {addedNotice.map((n) => `« ${n} »`).join(", ")} {addedNotice.length > 1 ? "ont été ajoutés" : "a été ajouté"} à votre
            liste. Indiquez la quantité, l’unité et vos souhaits de préparation.
          </p>
        )}
        <ListEditor items={draft.items} onChange={(items) => set({ items })} errors={itemErrors} />
        {errors.items && <p className="form-error" role="alert">{errors.items}</p>}
        <label>
          Instructions complémentaires <span className="optional">facultatif</span>
          <textarea rows={3} maxLength={1500} value={draft.notes} placeholder="Une remarque pour l’ensemble de la commande" onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </section>

      <section className="card">
        <h2>
          <span className="step">3</span> Votre retrait
        </h2>
        <PickupPicker
          date={draft.date}
          time={draft.time}
          phone={settings.phone}
          onSlots={setNeedTime}
          onChange={(date, time) => setDraft((d) => ({ ...d, date, time }))}
        />
        {errors.pickup && <p className="form-error" role="alert">{errors.pickup}</p>}
      </section>

      <p className="commercial-note">{COMMERCIAL_TEXT}</p>
      <div className="form-actions">
        <button className="button primary grow" type="submit">
          Vérifier ma liste <ArrowRight size={18} />
        </button>
      </div>
    </form>
    </div>
  );
}


/**
 * Champ de formulaire : le message d'erreur est hors de l'étiquette et relié
 * au champ (aria-describedby), pour être annoncé sans changer son nom.
 */
export function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  const described = error ? `${id}-erreur` : hint ? `${id}-aide` : undefined;
  return (
    <div className="field-wrap">
      <label htmlFor={`champ-${id}`}>
        {label}
        {optional && <span className="optional"> facultatif</span>}
      </label>
      {cloneElement(children, { id: `champ-${id}`, "aria-invalid": !!error, "aria-describedby": described })}
      {error ? (
        <span className="field-error" id={`${id}-erreur`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <small id={`${id}-aide`}>{hint}</small>
      ) : null}
    </div>
  );
}
