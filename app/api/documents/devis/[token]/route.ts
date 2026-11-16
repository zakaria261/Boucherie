import { getQuoteByToken, getSettings } from "@/lib/server/db";
import { pdfResponse, quoteDocument } from "@/lib/server/pdf";
import { publicQuote } from "@/lib/server/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Document du client : la demande de devis tant que la boucherie n'a pas
 * établi le devis, puis le devis numéroté. Accès par lien secret uniquement.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = /^[a-f0-9]{48}$/.test(token) ? await getQuoteByToken(token) : undefined;
  if (!quote) return new Response("Document introuvable.", { status: 404 });
  const visible = publicQuote(quote);
  const bytes = await quoteDocument(
    { ...quote, number: visible.number, lines: visible.lines, internalNotes: [] },
    await getSettings(),
    false,
  );
  const download = new URL(request.url).searchParams.get("telecharger") === "1";
  return pdfResponse(bytes, `${visible.number ? `devis-${visible.number}` : `demande-de-devis-${quote.id}`}.pdf`, download);
}
