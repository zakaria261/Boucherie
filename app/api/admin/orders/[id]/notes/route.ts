import { actor, authorize, fail, jsonBody, textField } from "@/lib/server/security";
import { addOrderNote } from "@/lib/server/orders";

export const runtime = "nodejs";

/** Note interne de l'équipe : jamais transmise au client. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const body = await jsonBody(request);
    const order = await addOrderNote(id, textField(body.text, "Note", 2000), actor(admin));
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
