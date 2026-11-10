// Sauvegarde complète : copie cohérente de la base SQLite + photos importées.
// Usage : npm run backup [-- dossier-de-destination]
// Peut tourner pendant que le site est en ligne (VACUUM INTO).
import { DatabaseSync } from "node:sqlite";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const data = path.resolve(process.env.BOUCHERIE_DATA_DIR || "data");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const target = path.resolve(process.argv[2] || "sauvegardes", `boucherie-${stamp}`);
const db = path.join(data, "boutique.sqlite");
if (!existsSync(db)) {
  console.error(`Base introuvable : ${db}`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });
new DatabaseSync(db).prepare("VACUUM INTO ?").run(path.join(target, "boutique.sqlite"));
if (existsSync(path.join(data, "uploads")))
  cpSync(path.join(data, "uploads"), path.join(target, "uploads"), { recursive: true });
console.log(`Sauvegarde créée : ${target}`);
