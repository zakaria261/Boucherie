// Restauration d'une sauvegarde créée par scripts/backup.mjs.
// Usage : arrêtez le site, puis npm run restore -- sauvegardes/boucherie-AAAA-...
// L'état actuel est d'abord mis de côté dans data/avant-restauration-<date>.
import { cpSync, existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";

const source = process.argv[2];
if (!source || !existsSync(path.join(source, "boutique.sqlite"))) {
  console.error("Indiquez le dossier d’une sauvegarde contenant boutique.sqlite.");
  process.exit(1);
}
const data = path.resolve(process.env.BOUCHERIE_DATA_DIR || "data");
mkdirSync(data, { recursive: true });
const aside = path.join(data, `avant-restauration-${Date.now()}`);
mkdirSync(aside);
for (const name of ["boutique.sqlite", "boutique.sqlite-wal", "boutique.sqlite-shm", "uploads"])
  if (existsSync(path.join(data, name))) renameSync(path.join(data, name), path.join(aside, name));
cpSync(path.join(source, "boutique.sqlite"), path.join(data, "boutique.sqlite"));
if (existsSync(path.join(source, "uploads")))
  cpSync(path.join(source, "uploads"), path.join(data, "uploads"), { recursive: true });
console.log(`Restauration terminée. Ancien état conservé dans ${aside}`);
console.log("Redémarrez le site.");

