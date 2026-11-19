import type { PickupSettings } from "@/lib/types";
import { hour, isOpenDay, scheduleLines } from "@/lib/pickup";
import { addDays, parisNow, weekday } from "@/lib/shop";

/** Horaires du jour (« 9h – 13h · 15h – 19h ») ou chaîne vide si fermé. */
export function todayHours(pickup: PickupSettings) {
  const today = parisNow().date;
  if (!isOpenDay(pickup, today)) return "";
  return scheduleLines(pickup).find((l) => l.day === weekday(today))!.text;
}

export function OpeningHours({
  pickup,
  note,
}: {
  pickup: PickupSettings;
  note?: string;
}) {
  const today = weekday(parisNow().date);
  return (
    <div className="hours-card">
      <h3>Horaires d’ouverture</h3>
      <dl className="hours-list">
        {scheduleLines(pickup).map((line) => (
          <div key={line.day} className={line.day === today ? "today" : ""}>
            <dt>{line.name}</dt>
            <dd>{line.text}</dd>
          </div>
        ))}
      </dl>
      {pickup.closed.length > 0 && (
        <p className="fine">
          Fermetures exceptionnelles :{" "}
          {pickup.closed
            .filter((d) => d >= parisNow().date)
            .slice(0, 6)
            .map((d) =>
              new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }),
            )
            .join(", ") || "aucune prévue"}
        </p>
      )}
      {note && <p className="fine pre">{note}</p>}
    </div>
  );
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const shortDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * État de la boutique à l'instant : « Ouvert · jusqu'à 19h »,
 * « Fermé · ouvre à 15h », « Fermé · ouvre demain à 9h ».
 * Calculé dans le navigateur (heure de Paris) pour être toujours exact.
 */
export function openStatus(pickup: PickupSettings, at = new Date()): { open: boolean; label: string } {
  const now = parisNow(at);
  const rangesOf = (date: string) =>
    isOpenDay(pickup, date) ? pickup.week.find((d) => d.day === weekday(date))?.ranges || [] : [];
  for (const [a, b] of rangesOf(now.date)) {
    if (now.minutes >= toMinutes(a) && now.minutes < toMinutes(b))
      return { open: true, label: `Ouvert · jusqu’à ${hour(b)}` };
    if (now.minutes < toMinutes(a)) return { open: false, label: `Fermé · ouvre à ${hour(a)}` };
  }
  for (let i = 1; i <= 14; i++) {
    const date = addDays(now.date, i);
    const first = rangesOf(date)[0];
    if (first)
      return {
        open: false,
        label: `Fermé · ouvre ${i === 1 ? "demain" : shortDays[weekday(date)]} à ${hour(first[0])}`,
      };
  }
  return { open: false, label: "Fermé" };
}
