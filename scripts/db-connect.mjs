// Connexion partagée par les scripts : Neon si DATABASE_URL est défini
// (récupérable avec « vercel env pull .env.local »), sinon la base locale
// PGlite (data/pglite). Arrêtez « npm run dev » avant d'utiliser la base locale.
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
// Connexion directe (sans pooler) recommandée pour les sauvegardes.
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;
export const remote = !!url;

/** { query(sql, args) → { rows, columns }, transaction(fn), close() } */
export async function connect() {
  if (remote) {
    const { default: pg } = await import("pg");
    pg.types.setTypeParser(20, (v) => Number(v));
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const query = async (sql, args = []) => {
      const r = await client.query(sql, args);
      return { rows: r.rows, columns: r.fields.map((f) => f.name) };
    };
    return {
      query,
      async transaction(fn) {
        await client.query("BEGIN");
        try {
          await fn(query);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      },
      close: () => client.end(),
    };
  }
  const dir = path.join(dataDir, "pglite");
  if (!existsSync(dir)) {
    console.error(`Base introuvable : ${dir}`);
    process.exit(1);
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(dir, { parsers: { 20: (v) => Number(v) } });
  const wrap = (c) => async (sql, args = []) => {
    const r = await c.query(sql, args);
    return { rows: r.rows, columns: r.fields.map((f) => f.name) };
  };
  return {
    query: wrap(db),
    transaction: (fn) => db.transaction((tx) => fn(wrap(tx))),
    close: () => db.close(),
  };
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
