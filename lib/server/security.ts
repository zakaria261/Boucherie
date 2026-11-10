import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { db } from "./db";
export const sessionCookie = "faubourg_admin";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password: string, stored: string) {
  try {
    const [salt, digest] = stored.split(":");
    const expected = Buffer.from(digest, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export function hasAdmin() {
  return !!db().prepare("SELECT id FROM admins LIMIT 1").get();
}
export async function currentAdmin() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  return (
    (db()
      .prepare(
        "SELECT admins.id, admins.email FROM sessions JOIN admins ON admins.id = sessions.admin_id WHERE sessions.hash = ? AND sessions.expires > ?",
      )
      .get(hash(token), Date.now()) as
      { id: number; email: string } | undefined) || null
  );
}
export async function requireAdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}
export async function authorize(request: Request) {
  sameOrigin(request);
  const admin = await currentAdmin();
  if (!admin) throw new HttpError(401, "Connectez-vous pour continuer.");
  return admin;
}
/** Lecture seule (GET) : le cookie SameSite=Strict suffit, pas d'en-tête Origin. */
export async function authorizeRead() {
  const admin = await currentAdmin();
  if (!admin) throw new HttpError(401, "Connectez-vous pour continuer.");
  return admin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new HttpError(403, "Origine de la requête refusée.");
}
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  db().prepare("DELETE FROM attempts WHERE expires < ?").run(now);
  const result = db()
    .prepare(
      "INSERT INTO attempts (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .get(key, now + windowMs) as { count: number };
  if (result.count > max)
    throw new HttpError(
      429,
      "Trop de tentatives. Réessayez dans quelques minutes.",
    );
}
/**
 * Ouvre une session. Par défaut 12 heures ; 30 jours si le propriétaire
 * choisit « Rester connecté » (utile pour l'application installée sur
 * l'iPhone, qui a sa propre connexion).
 */
export async function session(adminId: number, remember = false) {
  const token = randomBytes(32).toString("hex");
  const seconds = remember ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  db().prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?,?,?)")
    .run(hash(token), adminId, Date.now() + seconds * 1000);
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: seconds,
  });
}
export async function jsonBody(
  request: Request,
  max = 24000,
): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "Contenu trop volumineux.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Contenu manquant.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      throw new HttpError(413, "Contenu trop volumineux.");
    }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Données invalides.");
  }
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json(
    { error: "Une erreur est survenue. Veuillez réessayer." },
    { status: 500 },
  );
}
export function textField(value: unknown, label: string, max = 200, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new HttpError(400, `${label} : valeur invalide.`);
  return value.trim();
}
export function validImage(value: unknown) {
  const result = textField(value, "Image", 200);
  if (
    !/^\/images\/[a-zA-Z0-9._-]+$/.test(result) &&
    !/^\/media\/[a-f0-9-]+\.webp$/.test(result)
  )
    throw new HttpError(400, "Utilisez une image téléversée dans la boutique.");
  return result;
}
