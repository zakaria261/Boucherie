import { getOrders } from "@/lib/server/db";
import { actor, authorize, authorizeRead, fail, HttpError, jsonBody, textField } from "@/lib/server/security";
import { createManualOrder, type ManualDraft } from "@/lib/server/orders";
import { parseFreeItems, validEmail, validPhone } from "@/lib/requests";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liste des commandes pour l'actualisation automatique de l'application. */
export async function GET() {
  try {
    await authorizeRead();
    return Response.json(
      { orders: await getOrders(), at: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

/** Commande saisie par l'équipe (téléphone, comptoir, WhatsApp, photo). */
export async function POST(request: Request) {
  try {
    const admin = await authorize(request);
    const body = await jsonBody(request, 80000);
    const origin = body.origin as ManualDraft["origin"];
    if (!["telephone", "manuel", "photo", "whatsapp"].includes(origin))
      throw new HttpError(400, "Origine invalide.");
    const key = textField(body.requestKey, "Identifiant", 50);
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new HttpError(400, "Identifiant invalide.");
    const phone = textField(body.phone, "Téléphone", 25, 8);
    if (!validPhone(phone)) throw new HttpError(400, "Vérifiez le numéro de téléphone.");
    const email = textField(body.email ?? "", "E-mail", 150, 0);
    if (email && !validEmail(email)) throw new HttpError(400, "Vérifiez l’adresse e-mail.");
    const catalog = Array.isArray(body.catalog) ? body.catalog : [];
    if (catalog.length > 60) throw new HttpError(400, "Trop d’articles.");
    const freeRaw = Array.isArray(body.free) ? body.free : [];
    const free = freeRaw.length ? parseFreeItems(freeRaw, true) : { items: [], errors: {} };
    const [index, message] = Object.entries(free.errors)[0] || [];
    if (message) throw new HttpError(400, `Article libre ${Number(index) + 1} : ${message}`);
    const mediaId = body.mediaId ? textField(body.mediaId, "Photo", 40) : undefined;
    if (mediaId && !/^[a-f0-9]{32}$/.test(mediaId)) throw new HttpError(400, "Photo invalide.");
    const { order, created } = await createManualOrder(
      {
        key,
        origin,
        name: textField(body.name, "Nom du client", 100, 2),
        phone,
        email,
        date: textField(body.date, "Date de retrait", 10),
        time: textField(body.time ?? "", "Heure", 5, 0),
        notes: textField(body.notes ?? "", "Instructions", 1500, 0),
        catalog: catalog.map((line: Record<string, unknown>) => ({
          product: String(line.id ?? ""),
          grams: Number(line.grams),
          quantity: Number(line.quantity),
          options: line.options ?? [],
        })),
        free: free.items,
        mediaId,
      },
      actor(admin),
    );
    if (created) refreshSite();
    return Response.json({ order }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
