"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Pencil, Send } from "lucide-react";
import { parseFreeItems, validEmail, validPhone, validSiret, validVat, weightLabel } from "@/lib/requests";
import { formatTime, longDate } from "@/lib/shop";
import { proActivities, recurrences, type ProActivity, type Recurrence } from "@/lib/types";
import { blank, draftQuantity, draftWeight, emptyItem, ListEditor, serializeItems, type DraftItem } from "./list-editor";
import { PickupPicker } from "./pickup-picker";
import { attemptKey, Field, rememberOrder } from "./shopping-list-form";
import { useShop } from "./store";

export const PRO_TERMS =
  "Votre demande sera étudiée par notre équipe. Les disponibilités, les prix, les quantités finales et le créneau seront confirmés par la boucherie. Aucun tarif professionnel, délai de paiement ou service particulier n’est accordé automatiquement lors de l’envoi de ce formulaire.";

type Kind = "devis" | "commande";
type Draft = {
  contactName: string;
  company: string;
  country: string;
  siret: string;
  noSiret: boolean;
  noSiretReason: string;
  foreignId: string;
  activity: ProActivity | "";
  activityOther: string;
  phone: string;
  email: string;
  billingAddress: string;
  vatNumber: string;
  poReference: string;
  items: DraftItem[];
  notes: string;
  date: string;
  time: string;
  slotMode: "impératif" | "flexible";
  pickupContact: string;
  eventDate: string;
  covers: string;
  recurrence: Recurrence;
  recurrenceDetail: string;
  contactPreference: "téléphone" | "e-mail" | "indifférent";
};
const empty: Draft = {
  contactName: "",
  company: "",
  country: "France",
  siret: "",
  noSiret: false,
  noSiretReason: "",
  foreignId: "",
  activity: "",
  activityOther: "",
  phone: "",
  email: "",
  billingAddress: "",
  vatNumber: "",
  poReference: "",
  items: [emptyItem()],
  notes: "",
  date: "",
  time: "",
  slotMode: "impératif",
  pickupContact: "",
  eventDate: "",
  covers: "",
  recurrence: "ponctuel",
  recurrenceDetail: "",
  contactPreference: "indifférent",
};
const DRAFT_KEY = "faubourg-pro-brouillon";

export function ProRequestForm() {
  return (
    <Suspense fallback={<p className="muted">Chargement…</p>}>
      <ProForm />
    </Suspense>
  );
}

function ProForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { settings } = useShop();
  const [kind, setKind] = useState<Kind>(params.get("type") === "commande" ? "commande" : "devis");
  const [d, setD] = useState<Draft>(empty);
  const [step, setStep] = useState<"saisie" | "recap">("saisie");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [needTime, setNeedTime] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const loaded = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (saved && Array.isArray(saved.items) && saved.items.length) setD({ ...empty, ...saved });
    } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  }, [d]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const french = d.country.trim().toLowerCase() === "france";
  const filled = d.items.filter((i) => !blank(i));
  const keyName = `faubourg-pro-cle-${kind}`;

  function validate() {
    const e: Record<string, string> = {};
    if (d.contactName.trim().length < 3) e.contactName = "Indiquez le prénom et le nom du contact.";
    if (d.company.trim().length < 2) e.company = "Indiquez le nom de l’entreprise ou de la structure.";
    if (!d.country.trim()) e.country = "Indiquez le pays.";
    if (french && !d.noSiret && !validSiret(d.siret)) e.siret = "Le SIRET doit comporter 14 chiffres valides.";
    if (french && d.noSiret && d.noSiretReason.trim().length < 3) e.noSiretReason = "Précisez votre situation (association, structure en création…).";
    if (!d.activity) e.activity = "Choisissez votre type d’activité.";
    if (!validPhone(d.phone.trim())) e.phone = "Indiquez un numéro de téléphone valide.";
    if (!validEmail(d.email.trim())) e.email = "Indiquez une adresse e-mail professionnelle valide.";
    if (d.vatNumber.trim() && !validVat(d.vatNumber)) e.vatNumber = "Le numéro de TVA n’a pas un format valide.";
    if (kind === "commande") {
      if (!d.date) e.pickup = "Choisissez une date de retrait.";
      else if (needTime && !d.time) e.pickup = "Choisissez une heure de retrait.";
    }
    if (d.covers && (!/^\d+$/.test(d.covers) || Number(d.covers) < 1)) e.covers = "Nombre de couverts invalide.";
    const indexes = d.items.map((item, i) => (blank(item) ? -1 : i)).filter((i) => i >= 0);
    const result = parseFreeItems(serializeItems(indexes.map((i) => d.items[i]), true), true);
    const lineErrors: Record<number, string> = {};
    for (const [k, v] of Object.entries(result.errors)) lineErrors[indexes[Number(k)]] = v;
    if (result.error) e.items = "Ajoutez au moins un article complet : désignation, quantité et unité.";
    setErrors(e);
    setItemErrors(lineErrors);
    return !Object.keys(e).length && !Object.keys(lineErrors).length;
  }

  function review(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true], .field-error, .form-error")?.scrollIntoView({ block: "center" }),
      );
      return;
    }
    set({ items: filled });
    setStep("recap");
    top.current?.scrollIntoView({ block: "start" });
  }

  async function send() {
    if (busy) return;
    setBusy(true);
    setSendError("");
    try {
      const response = await fetch("/api/pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: attemptKey(keyName),
          requestType: kind,
          ...d,
          activity: d.activity,
          covers: d.covers || null,
          items: serializeItems(filled, true),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.token)
        throw new Error(result.error || "Votre demande n’a pas pu être enregistrée. Votre saisie est conservée : réessayez.");
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(keyName);
      } catch {}
      if (result.type === "commande") {
        rememberOrder(result.token, result.id);
        router.push(`/commande/suivi/${result.token}?confirmation=1`);
      } else router.push(`/professionnels/devis/${result.token}?confirmation=1`);
    } catch (e) {
      setSendError(
        e instanceof TypeError
          ? "Connexion impossible. Votre saisie est conservée : réessayez dans un instant, sans risque de doublon."
          : (e as Error).message,
      );
      setBusy(false);
    }
  }

  const sendLabel = kind === "devis" ? "Envoyer ma demande de devis" : "Envoyer ma demande de commande";
  const field = (name: keyof Draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field id={`pro-${name}`} label={label} error={errors[name]} hint={hint}>
      <input value={String(d[name])} onChange={(e) => set({ [name]: e.target.value } as Partial<Draft>)} {...props} />
    </Field>
  );

  return (
    <div ref={top} tabIndex={-1}>
      <div className="segmented-choice" role="radiogroup" aria-label="Type de demande">
        {(["devis", "commande"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            disabled={step === "recap" && busy}
            onClick={() => setKind(k)}
          >
            {k === "devis" ? "Demander un devis" : "Demander une commande"}
          </button>
        ))}
      </div>
      <p className="muted small">
        {kind === "devis"
          ? "La boucherie établit un devis à partir de votre demande. Rien n’est préparé avant votre accord."
          : "Votre demande de commande reste soumise à validation par la boucherie avant toute préparation."}
      </p>

      {step === "recap" ? (
        <div className="list-recap">
          <article className="paper-note pro" aria-label="Récapitulatif de votre demande">
            <header>
              <Building2 size={22} aria-hidden="true" />
              <div>
                <strong>{kind === "devis" ? "Demande de devis" : "Demande de commande"}</strong>
                <small>
                  {d.company} · {d.activity === "Autre" && d.activityOther ? d.activityOther : d.activity}
                </small>
              </div>
            </header>
            <dl className="recap-grid">
              <div>
                <dt>Contact</dt>
                <dd>
                  {d.contactName} · {d.phone} · {d.email}
                </dd>
              </div>
              <div>
                <dt>Identifiant</dt>
                <dd>{french ? (d.noSiret ? `Sans SIRET — ${d.noSiretReason}` : `SIRET ${d.siret}`) : `${d.country}${d.foreignId ? ` — ${d.foreignId}` : ""}`}</dd>
              </div>
              {d.vatNumber && (
                <div>
                  <dt>TVA intracommunautaire</dt>
                  <dd>{d.vatNumber}</dd>
                </div>
              )}
              {d.poReference && (
                <div>
                  <dt>Votre référence</dt>
                  <dd>{d.poReference}</dd>
                </div>
              )}
              <div>
                <dt>Retrait</dt>
                <dd>
                  {d.date ? `${longDate(d.date)}${d.time ? ` à ${formatTime(d.time)}` : ""}` : "À convenir"} · créneau {d.slotMode}
                  {d.pickupContact ? ` · retrait par ${d.pickupContact}` : ""}
                </dd>
              </div>
              <div>
                <dt>Besoin</dt>
                <dd>
                  {recurrences[d.recurrence]}
                  {d.recurrenceDetail ? ` — ${d.recurrenceDetail}` : ""}
                  {d.eventDate ? ` · événement le ${longDate(d.eventDate)}` : ""}
                  {d.covers ? ` · ${d.covers} couverts` : ""}
                </dd>
              </div>
            </dl>
            <ul>
              {filled.map((i) => {
                const w = i.unit === "piece" ? draftWeight(i) : null;
                return (
                  <li key={i.key}>
                    <span>
                      <strong>{i.name}</strong>
                      <small>
                        {[i.cut && `Découpe : ${i.cut}`, i.portionGrams && `${i.portionGrams} g par pièce`, w && `≈ ${weightLabel(w)} au total`, i.packaging && `Conditionnement : ${i.packaging}`, i.note]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                    <b>{draftQuantity(i)}</b>
                  </li>
                );
              })}
            </ul>
            {d.notes && (
              <p className="paper-notes">
                <strong>Consignes :</strong> {d.notes}
              </p>
            )}
          </article>
          <p className="commercial-note">{PRO_TERMS}</p>
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
              {busy ? "Envoi en cours…" : (
                <>
                  <Send size={17} /> {sendLabel}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form className="request-form" onSubmit={review} noValidate>
          <section className="card">
            <h2>
              <span className="step">1</span> Votre structure
            </h2>
            {field("contactName", "Prénom et nom du contact", { autoComplete: "name", maxLength: 120 })}
            {field("company", "Entreprise ou structure", { autoComplete: "organization", maxLength: 160 })}
            <div className="field-wrap">
              <label htmlFor="pro-activite">Type d’activité</label>
              <select
                id="pro-activite"
                value={d.activity}
                aria-invalid={!!errors.activity}
                aria-describedby={errors.activity ? "pro-activite-erreur" : undefined}
                onChange={(e) => set({ activity: e.target.value as ProActivity })}
              >
                <option value="">Choisir…</option>
                {proActivities.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              {errors.activity && (
                <span className="field-error" id="pro-activite-erreur" role="alert">
                  {errors.activity}
                </span>
              )}
            </div>
            {d.activity === "Autre" && field("activityOther", "Précisez votre activité", { maxLength: 80 })}
            {field("country", "Pays", { autoComplete: "country-name", maxLength: 60 })}
            {french ? (
              <>
                {!d.noSiret &&
                  field("siret", "SIRET", { inputMode: "numeric", maxLength: 20, autoComplete: "off" }, "14 chiffres. Nous vérifions le format, pas l’existence de l’entreprise.")}
                <label className="check-row">
                  <input type="checkbox" checked={d.noSiret} onChange={(e) => set({ noSiret: e.target.checked })} />
                  Ma structure ne dispose pas de SIRET
                </label>
                {d.noSiret && field("noSiretReason", "Précisez votre situation", { maxLength: 300, placeholder: "Ex. : association loi 1901 non immatriculée" })}
              </>
            ) : (
              field("foreignId", "Identifiant de l’entreprise dans votre pays", { maxLength: 40 }, "Numéro d’immatriculation local, facultatif.")
            )}
            <div className="field-pair">
              {field("phone", "Téléphone", { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 25 })}
              {field("email", "E-mail professionnel", { type: "email", inputMode: "email", autoComplete: "email", maxLength: 150 })}
            </div>
            <details className="more-fields">
              <summary>Informations de facturation (facultatives)</summary>
              {field("billingAddress", "Adresse de facturation", { autoComplete: "street-address", maxLength: 300 })}
              {field("vatNumber", "TVA intracommunautaire", { maxLength: 20, autoComplete: "off" })}
              {field("poReference", "Référence interne / bon de commande", { maxLength: 60 })}
            </details>
          </section>

          <section className="card">
            <h2>
              <span className="step">2</span> Vos articles
            </h2>
            <p className="muted small">
              Exemple : 40 steaks de 150 g → quantité 40, unité « pièces », poids cible 150 g par pièce.
            </p>
            <ListEditor pro items={d.items} onChange={(items) => set({ items })} errors={itemErrors} />
            {errors.items && <p className="form-error" role="alert">{errors.items}</p>}
            <label>
              Consignes de préparation et besoins particuliers <span className="optional">facultatif</span>
              <textarea rows={4} maxLength={3000} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
            </label>
          </section>

          <section className="card">
            <h2>
              <span className="step">3</span> Retrait et besoins
            </h2>
            <div className="pickup-place">
              <span>
                <strong>Retrait en boutique</strong>
                <small>{settings.address}</small>
              </span>
            </div>
            {kind === "devis" && <p className="muted small">Date souhaitée facultative pour un devis.</p>}
            <PickupPicker
              date={d.date}
              time={d.time}
              phone={settings.phone}
              required={kind === "commande"}
              onSlots={setNeedTime}
              onChange={(date, time) => setD((x) => ({ ...x, date, time }))}
            />
            {errors.pickup && <p className="form-error" role="alert">{errors.pickup}</p>}
            <div className="segmented-choice small" role="radiogroup" aria-label="Créneau">
              {(["impératif", "flexible"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={d.slotMode === m} onClick={() => set({ slotMode: m })}>
                  Créneau {m}
                </button>
              ))}
            </div>
            {field("pickupContact", "Personne qui viendra retirer (si différente)", { maxLength: 120 })}
            <div className="field-pair">
              {field("eventDate", "Date de l’événement", { type: "date" })}
              {field("covers", "Nombre de couverts", { inputMode: "numeric", maxLength: 6 })}
            </div>
            <label>
              Besoin
              <select value={d.recurrence} onChange={(e) => set({ recurrence: e.target.value as Recurrence })}>
                {Object.entries(recurrences).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              {d.recurrence !== "ponctuel" && <small>Un besoin récurrent est étudié avec vous : aucune commande future n’est créée automatiquement.</small>}
            </label>
            {d.recurrence !== "ponctuel" && field("recurrenceDetail", "Précisions sur la fréquence", { maxLength: 200, placeholder: "Ex. : chaque vendredi matin" })}
            <label>
              Préférence de contact
              <select value={d.contactPreference} onChange={(e) => set({ contactPreference: e.target.value as Draft["contactPreference"] })}>
                <option value="indifférent">Indifférent</option>
                <option value="téléphone">Téléphone</option>
                <option value="e-mail">E-mail</option>
              </select>
            </label>
          </section>

          <p className="commercial-note">{PRO_TERMS}</p>
          <div className="form-actions">
            <button className="button primary grow" type="submit">
              Vérifier ma demande <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
