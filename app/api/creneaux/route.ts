import { getSettings, slotLoad } from "@/lib/server/db";
import { daySlots, pickupDates } from "@/lib/pickup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Jours et créneaux de retrait disponibles, avec leur remplissage. */
export function GET(request: Request) {
  const sameDay = new URL(request.url).searchParams.get("jourMeme") === "1";
  const { pickup } = getSettings();
  const now = new Date();
  const dates = pickupDates(pickup, sameDay, now).map((date) => {
    if (!pickup.slotsEnabled) return { date, slots: [] };
    const load = slotLoad(date);
    return {
      date,
      slots: daySlots(pickup, date, now).map((time) => ({
        time,
        full: pickup.capacity > 0 && (load.get(time) || 0) >= pickup.capacity,
      })),
    };
  });
  return Response.json(
    {
      slotsEnabled: pickup.slotsEnabled,
      dates: dates.filter((d) => !pickup.slotsEnabled || d.slots.some((s) => !s.full)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
