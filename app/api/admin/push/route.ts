import {
  hasSubscription,
  removeSubscription,
  saveSubscription,
  vapidKeys,
} from "@/lib/server/push";
import {
  authorize,
  authorizeRead,
  fail,
  HttpError,
  jsonBody,
} from "@/lib/server/security";

export const runtime = "nodejs";

/** Clé publique et état de l'abonnement de cet appareil. */
export async function GET(request: Request) {
  try {
    await authorizeRead();
    const endpoint = new URL(request.url).searchParams.get("endpoint") || "";
    return Response.json(
      {
        publicKey: (await vapidKeys()).publicKey,
        subscribed: endpoint ? await hasSubscription(endpoint) : false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authorize(request);
    const body = await jsonBody(request, 4000);
    const keys = body.keys as Record<string, unknown> | undefined;
    if (
      typeof body.endpoint !== "string" ||
      !/^https:\/\//.test(body.endpoint) ||
      typeof keys?.p256dh !== "string" ||
      typeof keys?.auth !== "string"
    )
      throw new HttpError(400, "Abonnement invalide.");
    await saveSubscription(admin.id, {
      endpoint: body.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await authorize(request);
    const body = await jsonBody(request, 4000);
    if (typeof body.endpoint !== "string")
      throw new HttpError(400, "Abonnement invalide.");
    await removeSubscription(body.endpoint);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
