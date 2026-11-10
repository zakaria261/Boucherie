// Calcul des jours et créneaux de retrait, identique côté client et serveur.
// Ne doit importer que des types (exécuté tel quel par node --test).
import type { PickupSettings } from "./types";
import { addDays, parisNow, weekday } from "./shop.ts";

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;

export function isOpenDay(pickup: PickupSettings, date: string) {
  if (pickup.closed.includes(date)) return false;
  const day = pickup.week.find((d) => d.day === weekday(date));
  return !!day?.ranges.length;
}

/** Créneaux d'une journée, en tenant compte de l'heure actuelle le jour même. */
export function daySlots(
  pickup: PickupSettings,
  date: string,
  now = new Date(),
): string[] {
  if (!isOpenDay(pickup, date)) return [];
  const day = pickup.week.find((d) => d.day === weekday(date))!;
  const current = parisNow(now);
  const earliest =
    date === current.date ? current.minutes + pickup.sameDayLeadMinutes : 0;
  const step = Math.max(10, pickup.slotMinutes);
  const slots: string[] = [];
  for (const [start, end] of day.ranges) {
    for (let t = toMinutes(start); t + step <= toMinutes(end); t += step)
      if (t >= earliest) slots.push(fromMinutes(t));
  }
  return slots;
}

/**
 * Dates proposées. Le jour même n'est proposé que si tous les produits du
 * panier sont prêts aujourd'hui et que le boucher l'autorise.
 */
export function pickupDates(
  pickup: PickupSettings,
  sameDayAllowed: boolean,
  now = new Date(),
): string[] {
  const today = parisNow(now).date;
  const dates: string[] = [];
  const first = sameDayAllowed && pickup.sameDay ? 0 : pickup.leadDays;
  for (let i = first; i <= pickup.maxDays; i++) {
    const date = addDays(today, i);
    if (!isOpenDay(pickup, date)) continue;
    if (pickup.slotsEnabled && !daySlots(pickup, date, now).length) continue;
    dates.push(date);
  }
  return dates;
}

/** Message d'erreur si le retrait demandé n'est pas possible, sinon null. */
export function pickupError(
  pickup: PickupSettings,
  date: string,
  time: string,
  sameDayAllowed: boolean,
  now = new Date(),
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    return "Date de retrait invalide.";
  if (!pickupDates(pickup, sameDayAllowed, now).includes(date))
    return date === parisNow(now).date
      ? "Le retrait le jour même n’est possible que pour les produits prêts aujourd’hui."
      : "Cette date de retrait n’est pas disponible. Choisissez un autre jour.";
  if (!pickup.slotsEnabled) return time ? "Créneau invalide." : null;
  if (!daySlots(pickup, date, now).includes(time))
    return "Ce créneau n’est plus disponible. Choisissez-en un autre.";
  return null;
}

/** « 09:00 » → « 9h », « 15:30 » → « 15h30 ». */
export const hour = (time: string) => {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
};

const dayNames = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/** Horaires lisibles, du lundi au dimanche. */
export function scheduleLines(pickup: PickupSettings) {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const ranges = pickup.week.find((d) => d.day === day)?.ranges || [];
    return {
      day,
      name: dayNames[day],
      text: ranges.length
        ? ranges
            .map(([a, b]) => `${hour(a)} – ${hour(b)}`)
            .join(" · ")
        : "Fermé",
    };
  });
}
