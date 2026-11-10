import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { authorizeRead, fail } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Copie cohérente de la base (VACUUM INTO) à télécharger. Les photos du
 * dossier uploads se sauvegardent avec scripts/backup.mjs.
 */
export async function GET() {
  try {
    await authorizeRead();
    const file = path.join(tmpdir(), `faubourg-${randomUUID()}.sqlite`);
    db().prepare("VACUUM INTO ?").run(file);
    try {
      const data = await readFile(file);
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(data, {
        headers: {
          "Content-Type": "application/vnd.sqlite3",
          "Content-Disposition": `attachment; filename="boucherie-${stamp}.sqlite"`,
          "Cache-Control": "private, no-store",
        },
      });
    } finally {
      await rm(file, { force: true });
    }
  } catch (error) {
    return fail(error);
  }
}
