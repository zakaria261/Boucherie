import { getAudit } from "@/lib/server/db";
import { authorizeRead, fail } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Journal d'audit (propriétaire). */
export async function GET() {
  try {
    await authorizeRead("owner");
    return Response.json({ entries: await getAudit(300) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error);
  }
}
