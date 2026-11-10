import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
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

export const dataDirectory = path.resolve(
  /* turbopackIgnore: true */
  process.env.BOUCHERIE_DATA_DIR || path.join(process.cwd(), "data"),
);
const globalDb = globalThis as unknown as { boucherieDb?: DatabaseSync };

const OLD_HOURS =
  "Contactez-nous pour connaître nos horaires et organiser votre retrait.";

function migrate(connection: DatabaseSync, id: string, run: () => void) {
  if (connection.prepare("SELECT id FROM migrations WHERE id = ?").get(id))
    return;
  run();
  connection.prepare("INSERT INTO migrations VALUES (?)").run(id);
}

export function db() {
  if (globalDb.boucherieDb) return globalDb.boucherieDb;
  mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
  const connection = new DatabaseSync(
    path.join(dataDirectory, "boutique.sqlite"),
  );
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, request_key TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  connection.exec("BEGIN IMMEDIATE");
  try {
    migrate(connection, "initial-catalog", () => {
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
        connection
          .prepare("INSERT OR IGNORE INTO products VALUES (?, ?)")
          .run(item.id, JSON.stringify(product));
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
    connection
      .prepare("INSERT OR IGNORE INTO settings VALUES (1, ?)")
      .run(JSON.stringify(settings));
    // Les boutiques installées avant la refonte gardent leurs textes ; seuls
    // les champs restés vides reçoivent les coordonnées de l'ancien site.
    migrate(connection, "settings-v2", () => {
      const row = connection
        .prepare("SELECT data FROM settings WHERE id = 1")
        .get() as { data: string };
      const saved = JSON.parse(row.data) as Partial<Settings>;
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
      connection
        .prepare("UPDATE settings SET data = ? WHERE id = 1")
        .run(JSON.stringify(next));
    });
    migrate(connection, "recipes-seed", () => {
      const now = new Date().toISOString();
      for (const recipe of seedRecipes)
        connection
          .prepare("INSERT OR IGNORE INTO recipes VALUES (?, ?)")
          .run(
            recipe.id,
            JSON.stringify({
              ...recipe,
              published: true,
              createdAt: now,
              version: 1,
            } satisfies Recipe),
          );
    });
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
  globalDb.boucherieDb = connection;
  return connection;
}

/** Exécute fn dans une transaction exclusive (stocks, créneaux, promotions). */
export function transaction<T>(fn: () => T): T {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    connection.exec("COMMIT");
    return result;
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}

function rows<T>(sql: string, ...params: (string | number)[]): T[] {
  return (db().prepare(sql).all(...params) as { data: string }[]).map(
    (row) => JSON.parse(row.data) as T,
  );
}
function row<T>(sql: string, ...params: (string | number)[]): T | undefined {
  const result = db().prepare(sql).get(...params) as
    | { data: string }
    | undefined;
  return result ? (JSON.parse(result.data) as T) : undefined;
}

export function getProducts(includeHidden = false): Product[] {
  return rows<Product>("SELECT data FROM products ORDER BY rowid")
    .map(normalizeProduct)
    .filter((p) => includeHidden || p.published);
}
export function getProduct(id: string): Product | undefined {
  const product = row<Product>("SELECT data FROM products WHERE id = ?", id);
  return product ? normalizeProduct(product) : undefined;
}
export function saveProduct(product: Product) {
  db()
    .prepare("UPDATE products SET data = ? WHERE id = ?")
    .run(JSON.stringify(product), product.id);
}

export function getSettings(): Settings {
  return normalizeSettings(
    row<Settings>("SELECT data FROM settings WHERE id = 1")!,
  );
}

export function getOrders(): Order[] {
  return rows<Order>("SELECT data FROM orders ORDER BY rowid DESC").map(
    normalizeOrder,
  );
}
export function getOrder(token: string): Order | undefined {
  const order = row<Order>("SELECT data FROM orders WHERE token = ?", token);
  return order ? normalizeOrder(order) : undefined;
}
export function getOrderById(id: string): Order | undefined {
  const order = row<Order>("SELECT data FROM orders WHERE id = ?", id);
  return order ? normalizeOrder(order) : undefined;
}
export function saveOrder(order: Order) {
  db()
    .prepare("UPDATE orders SET data = ? WHERE id = ?")
    .run(JSON.stringify(order), order.id);
}

/** Commandes non annulées sur un créneau donné. */
export function slotLoad(date: string) {
  const counts = new Map<string, number>();
  for (const r of db()
    .prepare(
      "SELECT json_extract(data,'$.time') AS time, COUNT(*) AS n FROM orders WHERE json_extract(data,'$.date') = ? AND json_extract(data,'$.status') != 'Annulée' GROUP BY 1",
    )
    .all(date) as { time: string | null; n: number }[])
    counts.set(r.time || "", r.n);
  return counts;
}

export function getPromotions(): Promotion[] {
  return rows<Promotion>("SELECT data FROM promotions ORDER BY rowid DESC");
}
export function getPromotion(id: string) {
  return row<Promotion>("SELECT data FROM promotions WHERE id = ?", id);
}
export function savePromotion(promotion: Promotion) {
  db()
    .prepare(
      "INSERT INTO promotions VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    )
    .run(promotion.id, JSON.stringify(promotion));
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
export function getPublicProducts(now = new Date()): PublicProduct[] {
  const live = getPromotions().filter((p) => promotionLive(p, now));
  return getProducts().map((product) => {
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

export function getPosts(): Post[] {
  return rows<Post>("SELECT data FROM posts").sort((a, b) =>
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
export function getPublicPosts(now = new Date()) {
  return getPosts().filter((p) => postLive(p, now));
}
export function savePost(post: Post) {
  db()
    .prepare(
      "INSERT INTO posts VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    )
    .run(post.id, JSON.stringify(post));
}

export function getRecipes(includeHidden = false): Recipe[] {
  return rows<Recipe>("SELECT data FROM recipes ORDER BY rowid").filter(
    (r) => includeHidden || r.published,
  );
}
export function getRecipe(id: string) {
  return row<Recipe>("SELECT data FROM recipes WHERE id = ?", id);
}
export function saveRecipe(recipe: Recipe) {
  db()
    .prepare(
      "INSERT INTO recipes VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    )
    .run(recipe.id, JSON.stringify(recipe));
}

export function kvGet(key: string) {
  return (
    db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as
      | { value: string }
      | undefined
  )?.value;
}
export function kvSet(key: string, value: string) {
  db()
    .prepare(
      "INSERT INTO kv VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}
