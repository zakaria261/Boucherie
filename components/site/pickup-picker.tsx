"use client";
import { useEffect, useState } from "react";
import { addDays, formatTime, longDate, parisNow } from "@/lib/shop";

export type Slots = {
  slotsEnabled: boolean;
  dates: { date: string; slots: { time: string; full: boolean }[] }[];
};

function dayLabel(date: string) {
  const today = parisNow().date;
  if (date === today) return "Aujourd’hui";
  if (date === addDays(today, 1)) return "Demain";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });
}

/**
 * Jours et créneaux de retrait réellement disponibles (horaires, délai de
 * préparation, fermetures exceptionnelles, capacité), lus sur le serveur.
 * Le serveur revérifie tout à l'enregistrement.
 */
export function PickupPicker({
  date,
  time,
  onChange,
  phone,
  required = true,
  onSlots,
  days,
  fromTomorrow = false,
}: {
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
  phone?: string;
  required?: boolean;
  /** Indique si une heure doit être choisie (créneaux actifs). */
  onSlots?: (slotsEnabled: boolean) => void;
  /** Jours de la semaine autorisés (0 = dimanche) ; absent : tous. */
  days?: number[];
  /** Commande au minimum la veille : le jour même n'est pas proposé. */
  fromTomorrow?: boolean;
}) {
  const [slots, setSlots] = useState<Slots | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch("/api/creneaux", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Slots) => {
        if (cancelled) return;
        if (days?.length)
          data = { ...data, dates: data.dates.filter((d) => days.includes(new Date(`${d.date}T12:00:00Z`).getUTCDay())) };
        if (fromTomorrow) {
          const today = parisNow().date;
          data = { ...data, dates: data.dates.filter((d) => d.date > today) };
        }
        setSlots(data);
        onSlots?.(data.slotsEnabled);
        // Une date gardée d'une saisie précédente doit encore être proposée.
        if (date && !data.dates.some((d) => d.date === date)) onChange("", "");
      })
      .catch(() => !cancelled && setError("Impossible de charger les créneaux. Vérifiez votre connexion."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const day = slots?.dates.find((d) => d.date === date);
  useEffect(() => {
    if (day && time && !day.slots.some((s) => s.time === time && !s.full)) onChange(date, "");
  }, [day, date, time, onChange]);

  if (error)
    return (
      <div className="form-error" role="alert">
        {error}{" "}
        <button type="button" className="text-button" onClick={() => setAttempt((n) => n + 1)}>
          Réessayer
        </button>
      </div>
    );
  if (!slots) return <p className="muted">Chargement des créneaux…</p>;
  if (!slots.dates.length)
    return (
      <p className="form-error">
        Aucun créneau n’est disponible pour le moment.
        {phone ? ` Appelez-nous au ${phone} pour organiser votre retrait.` : ""}
      </p>
    );
  return (
    <>
      <fieldset>
        <legend>
          Date de récupération{required && <span className="sr-only"> (obligatoire)</span>}
        </legend>
        <div className="day-picker">
          {slots.dates.map((d) => (
            <button
              type="button"
              key={d.date}
              aria-pressed={date === d.date}
              aria-label={longDate(d.date)}
              onClick={() => onChange(d.date, "")}
            >
              <small>{dayLabel(d.date)}</small>
              <strong>{Number(d.date.slice(8))}</strong>
              <small>
                {new Date(`${d.date}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}
              </small>
            </button>
          ))}
        </div>
      </fieldset>
      {slots.slotsEnabled && day && (
        <fieldset>
          <legend>Heure de récupération · {longDate(day.date)}</legend>
          <div className="slot-grid">
            {day.slots.map((s) => (
              <button
                type="button"
                key={s.time}
                disabled={s.full}
                aria-pressed={time === s.time}
                onClick={() => onChange(date, s.time)}
              >
                {formatTime(s.time)}
                {s.full && <small>Complet</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {!slots.slotsEnabled && <p className="muted">L’heure de passage sera confirmée par la boucherie.</p>}
    </>
  );
}

/** Le créneau choisi est-il complet ? (heure exigée si les créneaux sont actifs) */
export const pickupComplete = (date: string, time: string, slotsEnabled = true) =>
  !!date && (!slotsEnabled || !!time);
