// Connexion partagée par les scripts : Turso si TURSO_DATABASE_URL est défini
// (récupérable avec « vercel env pull .env.local »), sinon data/boutique.sqlite.
import { createClient } from "@libsql/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

export const dataDir = path.resolve(process.env.BOUCHERIE_DATA_DIR || "data");
export const remote = !!process.env.TURSO_DATABASE_URL;

export function connect() {
  if (remote)
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  const file = path.join(dataDir, "boutique.sqlite");
  if (!existsSync(file)) {
    console.error(`Base introuvable : ${file}`);
    process.exit(1);
  }
  return createClient({ url: `file:${file}` });
}

// Les sessions et compteurs anti-abus ne sont pas sauvegardés.
export const TABLES = [
  "migrations",
  "settings",
  "products",
  "promotions",
  "orders",
  "posts",
  "recipes",
  "admins",
  "push_subscriptions",
  "kv",
];
