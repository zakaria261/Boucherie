import { saveOrder } from "@/lib/server/db";
import { statuses, type OrderStatus } from "@/lib/types";
import { authorize, fail, HttpError, jsonBody } from "@/lib/server/security";
import { changeStatus } from "@/lib/server/orders";
import { notifyStatusUpdate } from "@/lib/server/whatsapp";

export const runtime = "nodejs";

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
    const order = await changeStatus(
      id,
      body.status as OrderStatus,
      body.updatedAt,
      body.paidAmount,
    );
    order.whatsappNotifications = {
      owner: order.whatsappNotifications?.owner || "not-configured",
      customer: order.whatsappNotifications?.customer || "not-requested",
      status: await notifyStatusUpdate(order).catch(() => "failed" as const),
    };
    await saveOrder(order);
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
