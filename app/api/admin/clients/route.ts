import { getCompanies } from "@/lib/server/db";
import { authorizeRead, fail } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Répertoire des clients professionnels. */
export async function GET() {
  try {
    await authorizeRead();
    return Response.json({ companies: await getCompanies() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error);
  }
}
