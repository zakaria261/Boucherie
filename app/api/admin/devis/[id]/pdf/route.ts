import { getQuote, getSettings } from "@/lib/server/db";
import { authorizeRead, fail, HttpError } from "@/lib/server/security";
import { pdfResponse, quoteDocument } from "@/lib/server/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF côté boucherie : projet tant que le devis n'est pas établi. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorizeRead();
    const { id } = await params;
    const quote = await getQuote(id);
    if (!quote) throw new HttpError(404, "Devis introuvable.");
    const bytes = await quoteDocument(quote, await getSettings(), true);
    const download = new URL(request.url).searchParams.get("telecharger") === "1";
    return pdfResponse(bytes, `${quote.number ? `devis-${quote.number}` : `projet-${quote.id}`}.pdf`, download);
  } catch (error) {
    return fail(error);
  }
}
