import { getOrder, getSettings } from "@/lib/server/db";
import { orderDocument, pdfResponse } from "@/lib/server/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liste ou demande imprimable, accessible uniquement par son lien secret. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = /^[a-f0-9]{48}$/.test(token) ? await getOrder(token) : undefined;
  if (!order) return new Response("Document introuvable.", { status: 404 });
  const bytes = await orderDocument(order, await getSettings());
  const download = new URL(request.url).searchParams.get("telecharger") === "1";
  const name = order.origin === "liste" ? "liste-de-courses" : order.origin === "pro" ? "demande-de-commande" : "commande";
  return pdfResponse(bytes, `${name}-${order.id}.pdf`, download);
}
