import { actor, authorize, fail, jsonBody, textField } from "@/lib/server/security";
import { addQuoteNote } from "@/lib/server/quotes";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request);
    const { id } = await params;
    const quote = await addQuoteNote(id, textField((await jsonBody(request)).text, "Note", 2000), actor(admin));
    return Response.json({ quote });
  } catch (error) {
    return fail(error);
  }
}
