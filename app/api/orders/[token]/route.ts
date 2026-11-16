import { getOrder } from "@/lib/server/db";
import { publicOrder } from "@/lib/server/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Résumé d'une commande à partir de son lien de suivi secret. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const order = /^[a-f0-9]{48}$/.test(token)
    ? await getOrder(token)
    : undefined;
  if (!order)
    return Response.json({ error: "Commande introuvable." }, { status: 404 });
  return Response.json(
    publicOrder(order),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
