import { getQuotes } from "@/lib/server/db";
import { actor, authorize, authorizeRead, fail, jsonBody } from "@/lib/server/security";
import { createBlankQuote, parseCustomer } from "@/lib/server/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authorizeRead();
    return Response.json({ quotes: await getQuotes() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error);
  }
}

/** Nouveau devis établi par la boucherie (particulier ou professionnel). */
export async function POST(request: Request) {
  try {
    const admin = await authorize(request);
    const body = await jsonBody(request);
    const companyId = typeof body.companyId === "string" && /^CP-[A-F0-9]{8}$/.test(body.companyId) ? body.companyId : null;
    const quote = await createBlankQuote(parseCustomer(body.customer), companyId, actor(admin));
    return Response.json({ quote }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
