import { getOrders } from "@/lib/server/db";
import { authorizeRead, fail } from "@/lib/server/security";

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
