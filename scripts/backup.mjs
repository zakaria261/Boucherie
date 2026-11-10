// Sauvegarde complète : toutes les tables (JSON) + photos importées.
// Usage : npm run backup [-- dossier-de-destination]
// Fonctionne avec la base Turso (production) comme avec la base locale,
// pendant que le site est en ligne.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connect, dataDir, remote, TABLES } from "./db-connect.mjs";

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const target = path.resolve(process.argv[2] || "sauvegardes", `boucherie-${stamp}`);
mkdirSync(target, { recursive: true });

const client = connect();
const tables = {};
for (const name of TABLES) {
  const result = await client.execute(`SELECT * FROM ${name}`);
  tables[name] = { columns: result.columns, rows: result.rows.map((r) => result.columns.map((_, i) => r[i])) };
}
writeFileSync(
  path.join(target, "boutique.json"),
  JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), tables }),
);

const photos = path.join(target, "photos");
if (remote && process.env.BLOB_READ_WRITE_TOKEN) {
  const { list } = await import("@vercel/blob");
  mkdirSync(photos, { recursive: true });
  let cursor;
  do {
    const page = await list({ prefix: "photos/", cursor });
    for (const blob of page.blobs) {
      const response = await fetch(blob.url);
      writeFileSync(path.join(photos, path.basename(blob.pathname)), Buffer.from(await response.arrayBuffer()));
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
} else if (!remote && existsSync(path.join(dataDir, "uploads"))) {
  cpSync(path.join(dataDir, "uploads"), photos, { recursive: true });
}
client.close();
console.log(`Sauvegarde créée (${remote ? "Turso" : "base locale"}) : ${target}`);
