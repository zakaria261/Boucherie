import { attachDatabasePool } from "@vercel/functions";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import seed from "../products.json";
import type {
  Order,
  Post,
  Product,
  Promotion,
  PublicProduct,
  Recipe,
  Settings,
} from "../types";
import {
  defaultPickup,
  normalizeOrder,
  normalizeProduct,
  normalizeSettings,
} from "./normalize";
import { seedRecipes } from "./seed-recipes";

// Base de données Postgres : Neon en production (DATABASE_URL, connexion
// « pooled »), PGlite (Postgres embarqué, dossier data/pglite) en local et
// pour les tests. Chaque table garde ses documents JSON dans « data ».

export const dataDirectory = path.resolve(
  /* turbopackIgnore: true */
  process.env.BOUCHERIE_DATA_DIR || path.join(process.cwd(), "data"),
);
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

type Arg = string | number | null;
export type Result<T = Record<string, unknown>> = {
  rows: T[];
  rowsAffected: number;
  columns: string[];
};
type Query = (sql: string, args: Arg[]) => Promise<Result>;
type Driver = {
  query: Query;
  transaction: <T>(fn: (query: Query) => Promise<T>) => Promise<T>;
};

const globalDb = globalThis as unknown as { boucherieDb?: Promise<Driver> };
const currentTransaction = new AsyncLocalStorage<Query>();

/** Les requêtes s'écrivent avec « ? » ; Postgres attend $1, $2… */
const numbered = (sql: string) => {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
};

// Clé du verrou qui sérialise les écritures transactionnelles (stocks,
// créneaux, promotions) : équivalent de BEGIN IMMEDIATE en SQLite.
const WRITE_LOCK = 4_715_872;

const OLD_HOURS =
  "Contactez-nous pour connaître nos horaires et organiser votre retrait.";

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL, seq BIGSERIAL)",
  "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires BIGINT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, request_key TEXT UNIQUE NOT NULL, data TEXT NOT NULL, seq BIGSERIAL)",
  "CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY)",
  "CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY, data TEXT NOT NULL, seq BIGSERIAL)",
  "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, data TEXT NOT NULL, seq BIGSERIAL)",
  "CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, data TEXT NOT NULL, created BIGINT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
];

// BIGINT et COUNT(*) en nombres JavaScript (valeurs bien inférieures à 2^53).
const INT8 = 20;

function neon(url: string): Driver {
  pg.types.setTypeParser(INT8, (v) => Number(v));
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  // Ferme proprement les connexions inactives quand la fonction Vercel s'endort.
  attachDatabasePool(pool);
  const run =
    (client: pg.Pool | pg.PoolClient): Query =>
    async (sql, args) => {
      const r = await client.query(numbered(sql), args);
      return {
        rows: r.rows,
        rowsAffected: r.rowCount ?? 0,
        columns: r.fields.map((f) => f.name),
      };
    };
  return {
    query: run(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [WRITE_LOCK]);
        const result = await fn(run(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function embedded(): Promise<Driver> {
  if (process.env.VERCEL)
    // Sur Vercel, le disque est en lecture seule et non persistant.
    throw new Error(
      "Base de données non configurée : reliez une base Neon au projet Vercel (variable DATABASE_URL).",
    );
  mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(path.join(dataDirectory, "pglite"), {
    parsers: { [INT8]: (v: string) => Number(v) },
  });
  const run =
    (client: Pick<typeof db, "query">): Query =>
    async (sql, args) => {
      const r = await client.query<Record<string, unknown>>(numbered(sql), args);
      return {
        rows: r.rows,
        rowsAffected: r.affectedRows ?? 0,
        columns: r.fields.map((f) => f.name),
      };
    };
  return {
    query: run(db),
    transaction: (fn) => db.transaction((tx) => fn(run(tx))),
  };
}

async function open(): Promise<Driver> {
  const driver = databaseUrl ? neon(databaseUrl) : await embedded();
  await driver.transaction(async (query) => {
    for (const statement of SCHEMA) await query(statement, []);
    await currentTransaction.run(query, seedDatabase);
  });
  return driver;
}

/** Tables exportées par la sauvegarde (identique à scripts/db-connect.mjs). */
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
] as const;

async function migrate(id: string, run: () => Promise<void>) {
  if (await one("SELECT id FROM migrations WHERE id = ?", id)) return;
  await run();
  await exec("INSERT INTO migrations VALUES (?)", id);
}

async function seedDatabase() {
  await migrate("initial-catalog", async () => {
    const featured = [
      "côte-à-l-os-maturé",
      "brochette-de-poulet-provençale",
      "merguez-maison",
      "côte-d-agneau",
    ];
    for (const item of seed) {
      const product = normalizeProduct({
        ...item,
        description:
          "Sélectionné et préparé avec soin par nos artisans bouchers. Une belle pièce pour retrouver le plaisir de cuisiner et de partager.",
        ingredients: "",
        badge:
          item.id === "merguez-maison"
            ? "Fait maison"
            : item.id.includes("maturé")
              ? "La pièce d’exception"
              : "",
        published: true,
        available: true,
        featured: featured.includes(item.id),
        version: 1,
      });
      await exec(
        "INSERT INTO products VALUES (?, ?) ON CONFLICT DO NOTHING",
        item.id,
        JSON.stringify(product),
      );
    }
  });
  const settings: Settings = normalizeSettings({
    name: "Boucherie du Faubourg",
    logo: "/images/logo-original.png",
    headline: "Votre artisan boucher au cœur d’Amiens.",
    intro:
      "Des viandes choisies, des préparations faites maison et des conseils au comptoir. Commandez en ligne, nous préparons, vous passez récupérer.",
    hero: "/images/hero.jpg",
    announcement: "Commandez la veille, retirez le lendemain",
    address: "6 rue d’Abbeville, 80000 Amiens",
    email: "Boucheriefaubourg80@gmail.com",
    phone: "03 60 86 60 36",
    whatsapp: "",
    hours: "",
    story:
      "Depuis 2018, notre histoire s’écrit au 6 rue d’Abbeville, à Amiens. Avec une idée toute simple : vous proposer une viande de qualité et le plaisir d’être bien conseillé.\n\nDerrière notre comptoir, des bouchers passionnés qui sélectionnent, découpent et préparent avec soin. Une envie particulière ? Parlons-en, c’est aussi ça, le commerce de quartier.",
    storyImage: "/images/artisan.jpg",
    version: 1,
  });
  await exec(
    "INSERT INTO settings VALUES (1, ?) ON CONFLICT DO NOTHING",
    JSON.stringify(settings),
  );
  // Les boutiques installées avant la refonte gardent leurs textes ; seuls
  // les champs restés vides reçoivent les coordonnées de l'ancien site.
  await migrate("settings-v2", async () => {
    const saved = (await row<Partial<Settings>>(
      "SELECT data FROM settings WHERE id = 1",
    ))!;
    const next = normalizeSettings({
      ...saved,
      phone: saved.phone || "03 60 86 60 36",
      // Les horaires sont désormais structurés (Plus → Horaires et retraits) ;
      // ce champ ne sert plus qu'aux informations complémentaires.
      hours: saved.hours === OLD_HOURS ? "" : saved.hours || "",
      headline:
        !saved.headline ||
        saved.headline === "Le goût du bon.\nLe savoir-faire en plus."
          ? "Votre artisan boucher au cœur d’Amiens."
          : saved.headline,
      pickup: saved.pickup || defaultPickup,
    });
    await exec(
      "UPDATE settings SET data = ? WHERE id = 1",
      JSON.stringify(next),
    );
  });
  await migrate("recipes-seed", async () => {
    const now = new Date().toISOString();
    for (const recipe of seedRecipes)
      await exec(
        "INSERT INTO recipes VALUES (?, ?) ON CONFLICT DO NOTHING",
        recipe.id,
        JSON.stringify({
          ...recipe,
          published: true,
          createdAt: now,
          version: 1,
        } satisfies Recipe),
      );
  });
}

/** Connexion partagée, ouverte (et migrée) une seule fois par processus. */
export function db(): Promise<Driver> {
  globalDb.boucherieDb ??= open().catch((error) => {
    globalDb.boucherieDb = undefined;
    throw error;
  });
  return globalDb.boucherieDb;
}

/** Exécute une requête, dans la transaction en cours s'il y en a une. */
export async function exec(sql: string, ...args: Arg[]): Promise<Result> {
  const tx = currentTransaction.getStore();
  return tx ? tx(sql, args) : (await db()).query(sql, args);
}
export async function one<T>(sql: string, ...args: Arg[]) {
  return (await exec(sql, ...args)).rows[0] as T | undefined;
}
export async function all<T>(sql: string, ...args: Arg[]) {
  return (await exec(sql, ...args)).rows as T[];
}

/**
 * Exécute fn dans une transaction exclusive en écriture (stocks, créneaux,
 * promotions). Toutes les requêtes faites pendant fn en font partie.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (currentTransaction.getStore()) return fn();
  return (await db()).transaction((query) => currentTransaction.run(query, fn));
}

async function rows<T>(sql: string, ...params: Arg[]): Promise<T[]> {
  return (await all<{ data: string }>(sql, ...params)).map(
    (r) => JSON.parse(r.data) as T,
  );
}
async function row<T>(sql: string, ...params: Arg[]): Promise<T | undefined> {
  const result = await one<{ data: string }>(sql, ...params);
  return result ? (JSON.parse(result.data) as T) : undefined;
}

export async function getProducts(includeHidden = false): Promise<Product[]> {
  return (await rows<Product>("SELECT data FROM products ORDER BY seq"))
    .map(normalizeProduct)
    .filter((p) => includeHidden || p.published);
}
export async function getProduct(id: string): Promise<Product | undefined> {
  const product = await row<Product>(
    "SELECT data FROM products WHERE id = ?",
    id,
  );
  return product ? normalizeProduct(product) : undefined;
}
export async function saveProduct(product: Product) {
  await exec(
    "UPDATE products SET data = ? WHERE id = ?",
    JSON.stringify(product),
    product.id,
  );
}

export async function getSettings(): Promise<Settings> {
  return normalizeSettings(
    (await row<Settings>("SELECT data FROM settings WHERE id = 1"))!,
  );
}

export async function getOrders(): Promise<Order[]> {
  return (await rows<Order>("SELECT data FROM orders ORDER BY seq DESC")).map(
    normalizeOrder,
  );
}
export async function getOrder(token: string): Promise<Order | undefined> {
  const order = await row<Order>(
    "SELECT data FROM orders WHERE token = ?",
    token,
  );
  return order ? normalizeOrder(order) : undefined;
}
export async function getOrderById(id: string): Promise<Order | undefined> {
  const order = await row<Order>("SELECT data FROM orders WHERE id = ?", id);
  return order ? normalizeOrder(order) : undefined;
}
export async function saveOrder(order: Order) {
  await exec(
    "UPDATE orders SET data = ? WHERE id = ?",
    JSON.stringify(order),
    order.id,
  );
}

/** Commandes non annulées sur un créneau donné. */
export async function slotLoad(date: string) {
  const counts = new Map<string, number>();
  for (const r of await all<{ slot: string | null; n: number }>(
    "SELECT data::jsonb->>'time' AS slot, COUNT(*) AS n FROM orders WHERE data::jsonb->>'date' = ? AND data::jsonb->>'status' <> 'Annulée' GROUP BY 1",
    date,
  ))
    counts.set(r.slot || "", Number(r.n));
  return counts;
}

export function getPromotions(): Promise<Promotion[]> {
  return rows<Promotion>("SELECT data FROM promotions ORDER BY seq DESC");
}
export function getPromotion(id: string) {
  return row<Promotion>("SELECT data FROM promotions WHERE id = ?", id);
}
export async function savePromotion(promotion: Promotion) {
  await exec(
    "INSERT INTO promotions VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    promotion.id,
    JSON.stringify(promotion),
  );
}

export const promotionLive = (p: Promotion, now = new Date()) =>
  p.active &&
  p.startsAt <= now.toISOString() &&
  p.endsAt > now.toISOString() &&
  (p.maxQuantity === null || p.sold < p.maxQuantity);

export function promotionState(p: Promotion, now = new Date()) {
  const iso = now.toISOString();
  if (!p.active) return "Désactivée" as const;
  if (p.endsAt <= iso) return "Terminée" as const;
  if (p.maxQuantity !== null && p.sold >= p.maxQuantity)
    return "Épuisée" as const;
  if (p.startsAt > iso) return "Programmée" as const;
  return "En cours" as const;
}

/** Produits publiés, avec la meilleure promotion en cours. */
export async function getPublicProducts(
  now = new Date(),
): Promise<PublicProduct[]> {
  const live = (await getPromotions()).filter((p) => promotionLive(p, now));
  return (await getProducts()).map((product) => {
    const promo = live
      .filter((p) => p.productId === product.id && p.price < product.price)
      .sort((a, b) => a.price - b.price)[0];
    return {
      ...product,
      promo: promo
        ? {
            id: promo.id,
            price: promo.price,
            endsAt: promo.endsAt,
            remaining:
              promo.maxQuantity === null
                ? null
                : promo.maxQuantity - promo.sold,
            label: promo.label,
          }
        : null,
    };
  });
}

export async function getPosts(): Promise<Post[]> {
  return (await rows<Post>("SELECT data FROM posts")).sort((a, b) =>
    b.publishAt.localeCompare(a.publishAt),
  );
}
export function getPost(id: string) {
  return row<Post>("SELECT data FROM posts WHERE id = ?", id);
}
export const postLive = (p: Post, now = new Date()) =>
  !p.draft &&
  p.publishAt <= now.toISOString() &&
  (!p.endsAt || p.endsAt > now.toISOString());
export async function getPublicPosts(now = new Date()) {
  return (await getPosts()).filter((p) => postLive(p, now));
}
export async function savePost(post: Post) {
  await exec(
    "INSERT INTO posts VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    post.id,
    JSON.stringify(post),
  );
}

export async function getRecipes(includeHidden = false): Promise<Recipe[]> {
  return (await rows<Recipe>("SELECT data FROM recipes ORDER BY seq")).filter(
    (r) => includeHidden || r.published,
  );
}
export function getRecipe(id: string) {
  return row<Recipe>("SELECT data FROM recipes WHERE id = ?", id);
}
export async function saveRecipe(recipe: Recipe) {
  await exec(
    "INSERT INTO recipes VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    recipe.id,
    JSON.stringify(recipe),
  );
}

export async function kvGet(key: string) {
  return (
    await one<{ value: string }>("SELECT value FROM kv WHERE key = ?", key)
  )?.value;
}
export async function kvSet(key: string, value: string) {
  await exec(
    "INSERT INTO kv VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}
