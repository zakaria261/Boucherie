import { getOrder } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Résumé d'une commande à partir de son lien de suivi secret. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const order = /^[a-f0-9]{48}$/.test(token) ? getOrder(token) : undefined;
  if (!order)
    return Response.json({ error: "Commande introuvable." }, { status: 404 });
  return Response.json(
    {
      id: order.id,
      status: order.status,
      date: order.date,
      time: order.time,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items,
    },
    { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}
