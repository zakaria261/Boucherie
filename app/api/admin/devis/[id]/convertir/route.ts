import { actor, authorize, fail, jsonBody, textField } from "@/lib/server/security";
import { convertQuote } from "@/lib/server/quotes";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";

/** Crée la commande d'un devis accepté (une seule fois). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    const result = await convertQuote(
      id,
      body.version,
      { date: textField(body.date, "Date de retrait", 10), time: textField(body.time ?? "", "Heure", 5, 0) },
      actor(admin),
    );
    refreshSite();
    return Response.json(result, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
