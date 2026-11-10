import type { PickupSettings } from "@/lib/types";
import { isOpenDay, scheduleLines } from "@/lib/pickup";
import { parisNow, weekday } from "@/lib/shop";

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
