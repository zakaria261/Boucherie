"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { DaySchedule, Settings } from "@/lib/types";
import { scheduleLines } from "@/lib/pickup";
import { api } from "./api";
import { ImageField } from "./image-field";
import { NavHeader, Section, Stepper, Toggle, useHud } from "./ui";

/** Brouillon des réglages, enregistré en une fois avec contrôle de version. */
function useSettingsDraft(initial: Settings) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const set = (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  async function save(message = "Modifications enregistrées") {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ settings: Settings }>("/api/admin/settings", "PUT", settings);
      setSettings(result.settings);
      setDirty(false);
      show(message);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { settings, set, save, dirty, busy, error, hud };
}

export function ShopSettings({ initial }: { initial: Settings }) {
  const { settings: s, set, save, busy, error, hud } = useSettingsDraft(initial);
  const [uploading, setUploading] = useState(false);
  const text = (
    key: keyof Settings,
    label: string,
    options: { max?: number; rows?: number; type?: string; placeholder?: string; hint?: string; required?: boolean } = {},
  ) => (
    <label className="field">
      <span>{label}</span>
      {options.rows ? (
        <textarea
          rows={options.rows}
          maxLength={options.max}
          value={s[key] as string}
          placeholder={options.placeholder}
          onChange={(e) => set({ [key]: e.target.value })}
        />
      ) : (
        <input
          type={options.type || "text"}
          maxLength={options.max}
          required={options.required}
          value={s[key] as string}
          placeholder={options.placeholder}
          onChange={(e) => set({ [key]: e.target.value })}
        />
      )}
      {options.hint && <small>{options.hint}</small>}
    </label>
  );
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <NavHeader title="Ma boutique" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <Section title="Coordonnées">
          {text("name", "Nom de la boutique", { max: 100, required: true })}
          {text("address", "Adresse", { max: 250, required: true })}
          <label className="field">
            <span>Téléphone</span>
            <input type="tel" maxLength={35} value={s.phone} onChange={(e) => set({ phone: e.target.value })} />
          </label>
          {text("email", "E-mail", { type: "email", max: 150, required: true })}
          {text("whatsapp", "Numéro WhatsApp de la boucherie", {
            type: "tel",
            max: 35,
            placeholder: "06 12 34 56 78",
            hint: "Les clients peuvent vous écrire sur ce numéro. Facultatif : les commandes arrivent ici même sans WhatsApp.",
          })}
        </Section>
        <Section title="Accueil du site">
          {text("headline", "Accroche sous le nom", { max: 200, required: true })}
          {text("announcement", "Message du bandeau supérieur", { max: 150, required: true })}
          {text("intro", "Présentation courte", { max: 700, rows: 3, required: true })}
          <div className="pad">
            <span className="field-title">Photo d’accueil</span>
            <ImageField label="Photo d’accueil" value={s.hero} onChange={(v) => set({ hero: v })} onBusy={setUploading} />
          </div>
          <div className="pad">
            <span className="field-title">Logo</span>
            <ImageField label="Logo de la boutique" value={s.logo} onChange={(v) => set({ logo: v })} onBusy={setUploading} />
          </div>
        </Section>
        <Section title="Notre maison">
          {text("story", "Votre histoire", { max: 6000, rows: 6, required: true })}
          <div className="pad">
            <span className="field-title">Photo de la maison</span>
            <ImageField label="Photo de la maison" value={s.storyImage} onChange={(v) => set({ storyImage: v })} onBusy={setUploading} />
          </div>
          {text("hours", "Informations complémentaires", {
            max: 1000,
            rows: 3,
            hint: "Affichées sous les horaires (ex. fermeture estivale). Les horaires se règlent dans Horaires et retraits.",
          })}
        </Section>
        <Section title="Mentions légales" footer="Ces informations apparaissent dans la page Mentions légales du site.">
          {(
            [
              ["company", "Raison sociale"],
              ["legalForm", "Forme juridique et capital"],
              ["siren", "SIREN"],
              ["director", "Responsable de la publication"],
              ["host", "Hébergeur (nom, adresse, téléphone)"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                value={s.legal[key]}
                maxLength={key === "host" ? 400 : 150}
                onChange={(e) => set({ legal: { ...s.legal, [key]: e.target.value } })}
              />
            </label>
          ))}
        </Section>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="action-bar">
        <button className="btn filled large" disabled={busy || uploading}>
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
      {hud}
    </form>
  );
}

const dayOrder = [1, 2, 3, 4, 5, 6, 0];

export function PickupSettingsScreen({ initial }: { initial: Settings }) {
  const { settings, set, save, busy, error, hud } = useSettingsDraft(initial);
  const p = settings.pickup;
  const [closedDate, setClosedDate] = useState("");
  const setPickup = (patch: Partial<typeof p>) => set({ pickup: { ...p, ...patch } });
  const setDay = (day: number, ranges: DaySchedule["ranges"]) =>
    setPickup({ week: p.week.map((d) => (d.day === day ? { ...d, ranges } : d)) });
  const names = Object.fromEntries(scheduleLines(p).map((l) => [l.day, l.name]));

  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save("Horaires enregistrés");
      }}
    >
      <NavHeader title="Horaires et retraits" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        {!p.verified && (
          <div className="callout warning">
            <span>
              <strong>Horaires à vérifier</strong>
              <small>
                Ils ont été repris de l’ancien site. Vérifiez-les puis cochez
                « Horaires vérifiés » en bas de page.
              </small>
            </span>
          </div>
        )}
        <Section title="Horaires d’ouverture" footer="Affichés sur le site et utilisés pour les créneaux de retrait.">
          {dayOrder.map((day) => {
            const ranges = p.week.find((d) => d.day === day)?.ranges || [];
            return (
              <div className="day-row" key={day}>
                <label className="row toggle-row">
                  <span className="row-label">{names[day]}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="switch"
                    aria-label={`${names[day]} ouvert`}
                    checked={ranges.length > 0}
                    onChange={(e) => setDay(day, e.target.checked ? [["09:00", "13:00"]] : [])}
                  />
                </label>
                {ranges.map(([start, end], i) => (
                  <div className="range-row" key={i}>
                    <input
                      type="time"
                      aria-label={`${names[day]} ouverture ${i + 1}`}
                      value={start}
                      onChange={(e) => setDay(day, ranges.map((r, n) => (n === i ? [e.target.value, r[1]] : r)))}
                    />
                    <span>à</span>
                    <input
                      type="time"
                      aria-label={`${names[day]} fermeture ${i + 1}`}
                      value={end}
                      onChange={(e) => setDay(day, ranges.map((r, n) => (n === i ? [r[0], e.target.value] : r)))}
                    />
                    <button
                      type="button"
                      className="nav-icon"
                      aria-label="Supprimer la plage"
                      onClick={() => setDay(day, ranges.filter((_, n) => n !== i))}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
                {ranges.length > 0 && ranges.length < 3 && (
                  <button
                    type="button"
                    className="add-range"
                    onClick={() => setDay(day, [...ranges, ["15:00", "19:00"]])}
                  >
                    <Plus size={14} /> Ajouter une plage
                  </button>
                )}
              </div>
            );
          })}
        </Section>

        <Section title="Commandes en ligne">
          <div className="row stepper-row">
            <span className="row-text">
              <span className="row-label">Délai de préparation</span>
              <span className="row-detail">Jours minimum avant le retrait</span>
            </span>
            <Stepper
              label="délai en jours"
              value={p.leadDays}
              min={0}
              max={14}
              onChange={(v) => setPickup({ leadDays: v })}
              format={(v) => (v === 0 ? "Jour même" : v === 1 ? "Lendemain" : `${v} jours`)}
            />
          </div>
          <Toggle
            label="Jour même pour les produits prêts"
            detail="Uniquement si tout le panier est « Prêt aujourd’hui »"
            checked={p.sameDay}
            onChange={(v) => setPickup({ sameDay: v })}
          />
          {p.sameDay && (
            <div className="row stepper-row">
              <span className="row-text">
                <span className="row-label">Préparation le jour même</span>
                <span className="row-detail">Délai minimum avant le créneau</span>
              </span>
              <Stepper
                label="délai jour même"
                value={p.sameDayLeadMinutes}
                step={15}
                min={0}
                max={600}
                onChange={(v) => setPickup({ sameDayLeadMinutes: v })}
                format={(v) => (v >= 60 ? `${Math.floor(v / 60)} h ${v % 60 ? v % 60 : ""}`.trim() : `${v} min`)}
              />
            </div>
          )}
          <div className="row stepper-row">
            <span className="row-text">
              <span className="row-label">Réservation jusqu’à</span>
            </span>
            <Stepper label="jours de réservation" value={p.maxDays} min={1} max={90} onChange={(v) => setPickup({ maxDays: v })} format={(v) => `${v} jours`} />
          </div>
        </Section>

        <Section title="Créneaux">
          <Toggle
            label="Proposer des créneaux horaires"
            detail="Sinon, le client choisit seulement le jour"
            checked={p.slotsEnabled}
            onChange={(v) => setPickup({ slotsEnabled: v })}
          />
          {p.slotsEnabled && (
            <>
              <div className="row stepper-row">
                <span className="row-label">Durée d’un créneau</span>
                <Stepper label="durée du créneau" value={p.slotMinutes} step={15} min={15} max={120} onChange={(v) => setPickup({ slotMinutes: v })} format={(v) => `${v} min`} />
              </div>
              <div className="row stepper-row">
                <span className="row-text">
                  <span className="row-label">Commandes par créneau</span>
                  <span className="row-detail">0 : sans limite</span>
                </span>
                <Stepper label="capacité" value={p.capacity} min={0} max={100} onChange={(v) => setPickup({ capacity: v })} format={(v) => (v ? String(v) : "∞")} />
              </div>
            </>
          )}
        </Section>

        <Section title="Fermetures exceptionnelles">
          {p.closed.map((d) => (
            <div className="row" key={d}>
              <span className="row-label">
                {new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </span>
              <button
                type="button"
                className="nav-icon"
                aria-label="Retirer la fermeture"
                onClick={() => setPickup({ closed: p.closed.filter((x) => x !== d) })}
              >
                <X size={17} />
              </button>
            </div>
          ))}
          <div className="row field-row">
            <input type="date" aria-label="Date de fermeture" value={closedDate} onChange={(e) => setClosedDate(e.target.value)} />
            <button
              type="button"
              className="btn tinted small"
              disabled={!closedDate}
              onClick={() => {
                setPickup({ closed: [...new Set([...p.closed, closedDate])].sort() });
                setClosedDate("");
              }}
            >
              Ajouter
            </button>
          </div>
        </Section>

        <Section>
          <Toggle
            label="Horaires vérifiés"
            detail="Je confirme que ces horaires sont à jour"
            checked={p.verified}
            onChange={(v) => setPickup({ verified: v })}
          />
        </Section>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="action-bar">
        <button className="btn filled large" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les horaires"}
        </button>
      </div>
      {hud}
    </form>
  );
}
