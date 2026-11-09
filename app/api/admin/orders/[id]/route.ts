import { db } from "@/lib/server/db";
import { statuses, type Order, type OrderStatus } from "@/lib/types";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { notifyStatusUpdate } from "@/lib/server/whatsapp";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    if (!(statuses as readonly unknown[]).includes(body.status))
      throw new HttpError(400, "Statut invalide.");
    const row = db().prepare("SELECT data FROM orders WHERE id = ?").get(id) as
      { data: string } | undefined;
    if (!row) throw new HttpError(404, "Commande introuvable.");
    const order = JSON.parse(row.data) as Order;
    if (body.updatedAt !== order.updatedAt)
      throw new HttpError(409, "Cette commande a changé. Rechargez la page.");
    order.status = body.status as OrderStatus;
    order.updatedAt = new Date().toISOString();
    order.whatsappNotifications = {
      owner: order.whatsappNotifications?.owner || "not-configured",
      customer: order.whatsappNotifications?.customer || "not-requested",
      status: await notifyStatusUpdate(order),
    };
    db()
      .prepare("UPDATE orders SET data = ? WHERE id = ?")
      .run(JSON.stringify(order), id);
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
