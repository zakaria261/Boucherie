// Restauration d'une sauvegarde créée par scripts/backup.mjs.
// Usage : npm run restore -- sauvegardes/boucherie-AAAA-...
// Une sauvegarde de l'état actuel est faite d'abord, puis toutes les tables
// sont remplacées en une seule transaction (tout ou rien).
// Les photos locales sont recopiées dans data/uploads ; en ligne, les photos
// restent dans Vercel Blob (elles n'y sont jamais supprimées).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { connect, dataDir, remote, TABLES } from "./db-connect.mjs";

const source = process.argv[2];
if (!source || !existsSync(path.join(source, "boutique.json"))) {
  console.error("Indiquez le dossier d’une sauvegarde contenant boutique.json.");
  process.exit(1);
}
const backup = JSON.parse(readFileSync(path.join(source, "boutique.json"), "utf8"));
if (backup.format !== 1) {
  console.error("Format de sauvegarde inconnu.");
  process.exit(1);
}

console.log("Sauvegarde de l’état actuel avant restauration…");
execFileSync(process.execPath, [path.resolve("scripts/backup.mjs"), "sauvegardes/avant-restauration"], {
  stdio: "inherit",
});

const client = connect();
const statements = [];
for (const name of [...TABLES, "sessions"]) statements.push(`DELETE FROM ${name}`);
for (const name of TABLES) {
  const table = backup.tables[name];
  if (!table) continue;
  const marks = table.columns.map(() => "?").join(",");
  for (const row of table.rows)
    statements.push({
      sql: `INSERT INTO ${name} (${table.columns.join(",")}) VALUES (${marks})`,
      args: row,
    });
}
await client.batch(statements, "write");
client.close();

if (!remote && existsSync(path.join(source, "photos"))) {
  mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
  cpSync(path.join(source, "photos"), path.join(dataDir, "uploads"), { recursive: true });
}
console.log(`Restauration terminée (${remote ? "Turso" : "base locale"}). Les sessions ont été fermées : reconnectez-vous.`);
