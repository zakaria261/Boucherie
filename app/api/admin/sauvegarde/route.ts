import { exec, TABLES } from "@/lib/server/db";
import { authorizeRead, fail } from "@/lib/server/security";

export const runtime = "nodejs";

/** Données binaires (photos privées) encodées pour le JSON. */
const encode = (value: unknown) =>
  value instanceof Uint8Array ? { $bytes: Buffer.from(value).toString("base64") } : value;
export const dynamic = "force-dynamic";

/**
 * Export complet de la base (JSON, même format que « npm run backup »,
 * restaurable avec « npm run restore »). Les sessions de connexion et les
 * compteurs anti-abus ne sont pas inclus.
 */
export async function GET() {
  try {
    await authorizeRead("owner");
    const tables: Record<string, { columns: string[]; rows: unknown[][] }> = {};
    for (const name of TABLES) {
      const result = await exec(`SELECT * FROM ${name}`);
      tables[name] = {
        columns: result.columns,
        rows: result.rows.map((row) => result.columns.map((c) => encode(row[c]))),
      };
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(
      JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), tables }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="boucherie-${stamp}.json"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return fail(error);
  }
}
