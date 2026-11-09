import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import seed from "../products.json";
import type { Product, Settings, Order } from "../types";
export const dataDirectory = path.resolve(
  /* turbopackIgnore: true */
  process.env.BOUCHERIE_DATA_DIR || path.join(process.cwd(), "data"),
);
const globalDb = globalThis as unknown as { boucherieDb?: DatabaseSync };
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
  `);
  connection.exec("BEGIN IMMEDIATE");
  try {
    if (
      !connection
        .prepare("SELECT id FROM migrations WHERE id = ?")
        .get("initial-catalog")
    ) {
      const featured = [
        "côte-à-l-os-maturé",
        "brochette-de-poulet-provençale",
        "merguez-maison",
        "côte-d-agneau",
      ];
      for (const item of seed) {
        const product: Product = {
          ...item,
          description:
            "Sélectionné et préparé avec soin par nos artisans bouchers. Une belle pièce pour retrouver le plaisir de cuisiner et de partager.",
          ingredients:
            "Pour les ingrédients, les allergènes et la provenance, demandez conseil à votre boucher avant de commander.",
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
        };
        connection
          .prepare("INSERT OR IGNORE INTO products VALUES (?, ?)")
          .run(item.id, JSON.stringify(product));
      }
      connection
        .prepare("INSERT INTO migrations VALUES (?)")
        .run("initial-catalog");
    }
    const settings: Settings = {
      name: "Boucherie du Faubourg",
      logo: "/images/logo-original.png",
      headline: "Le goût du bon.\nLe savoir-faire en plus.",
      intro:
        "De belles pièces, des préparations maison et la passion du métier. Tout simplement, une viande comme on l’aime.",
      hero: "/images/hero.jpg",
      announcement: "Commandez la veille, retirez le lendemain",
      address: "6 rue d’Abbeville, 80000 Amiens",
      email: "Boucheriefaubourg80@gmail.com",
      phone: "",
      whatsapp: "",
      hours:
        "Contactez-nous pour connaître nos horaires et organiser votre retrait.",
      story:
        "Depuis 2018, notre histoire s’écrit au 6 rue d’Abbeville, à Amiens. Avec une idée toute simple : vous proposer une viande de qualité et le plaisir d’être bien conseillé.\n\nDerrière notre comptoir, des bouchers passionnés qui sélectionnent, découpent et préparent avec soin. Une envie particulière ? Parlons-en, c’est aussi ça, le commerce de quartier.",
      storyImage: "/images/artisan.jpg",
      version: 1,
    };
    connection
      .prepare("INSERT OR IGNORE INTO settings VALUES (1, ?)")
      .run(JSON.stringify(settings));
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
  globalDb.boucherieDb = connection;
  return connection;
}
export function getProducts(includeHidden = false): Product[] {
  return (
    db().prepare("SELECT data FROM products ORDER BY rowid").all() as {
      data: string;
    }[]
  )
    .map((row) => JSON.parse(row.data) as Product)
    .filter((p) => includeHidden || p.published);
}
export function getProduct(id: string): Product | undefined {
  const row = db().prepare("SELECT data FROM products WHERE id = ?").get(id) as
    { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}
export function getSettings(): Settings {
  const saved = JSON.parse(
    (
      db().prepare("SELECT data FROM settings WHERE id = 1").get() as {
        data: string;
      }
    ).data,
  ) as Partial<Settings>;
  return { ...saved, whatsapp: saved.whatsapp || "" } as Settings;
}
export function getOrders(): Order[] {
  return (
    db().prepare("SELECT data FROM orders ORDER BY rowid DESC").all() as {
      data: string;
    }[]
  ).map((row) => JSON.parse(row.data));
}
export function getOrder(token: string): Order | undefined {
  const row = db()
    .prepare("SELECT data FROM orders WHERE token = ?")
    .get(token) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}
