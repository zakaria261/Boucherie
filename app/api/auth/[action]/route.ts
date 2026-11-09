import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/server/db";
import {
  authorize,
  checkPassword,
  fail,
  hasAdmin,
  hash,
  hashPassword,
  HttpError,
  jsonBody,
  rateLimit,
  sameOrigin,
  session,
  sessionCookie,
  textField,
} from "@/lib/server/security";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request);
    const { action } = await params;
    if (action === "logout") {
      const token = (await cookies()).get(sessionCookie)?.value;
      if (token)
        db().prepare("DELETE FROM sessions WHERE hash = ?").run(hash(token));
      (await cookies()).delete(sessionCookie);
      return Response.json({ ok: true });
    }
    if (action === "password") {
      const admin = await authorize(request);
      rateLimit(`password:${admin.id}`, 10, 15 * 60 * 1000);
      const body = await jsonBody(request);
      const password = textField(body.password, "Mot de passe", 200, 12);
      const current = textField(body.current, "Mot de passe actuel", 200);
      const row = db()
        .prepare("SELECT password FROM admins WHERE id = ?")
        .get(admin.id) as { password: string };
      if (!checkPassword(current, row.password))
        throw new HttpError(400, "Le mot de passe actuel est incorrect.");
      db()
        .prepare("UPDATE admins SET password = ? WHERE id = ?")
        .run(hashPassword(password), admin.id);
      db().prepare("DELETE FROM sessions WHERE admin_id = ?").run(admin.id);
      await session(admin.id);
      return Response.json({ ok: true });
    }
    if (!["login", "setup"].includes(action))
      throw new HttpError(404, "Page introuvable.");
    rateLimit("auth-global", 30, 15 * 60 * 1000);
    const body = await jsonBody(request);
    const email = textField(body.email, "E-mail", 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, "E-mail invalide.");
    rateLimit(`auth:${hash(email)}`, 8, 15 * 60 * 1000);
    const password = textField(
      body.password,
      "Mot de passe",
      200,
      action === "setup" ? 12 : 1,
    );
    if (action === "setup") {
      const expected = process.env.ADMIN_SETUP_TOKEN;
      if (!expected || hasAdmin())
        throw new HttpError(403, "La création de compte est fermée.");
      const token = typeof body.token === "string" ? body.token : "";
      if (
        !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(hash(expected)))
      )
        throw new HttpError(403, "Code d’installation incorrect.");
      try {
        db()
          .prepare("INSERT INTO admins (id,email,password) VALUES (1,?,?)")
          .run(email, hashPassword(password));
      } catch {
        throw new HttpError(409, "Un compte existe déjà.");
      }
      await session(1);
      return Response.json({ ok: true });
    }
    const admin = db()
      .prepare("SELECT id,password FROM admins WHERE email = ?")
      .get(email) as { id: number; password: string } | undefined;
    if (
      !checkPassword(
        password,
        admin?.password ||
          "00000000000000000000000000000000:" + "00".repeat(64),
      ) ||
      !admin
    )
      throw new HttpError(401, "E-mail ou mot de passe incorrect.");
    db()
      .prepare("DELETE FROM attempts WHERE key = ?")
      .run(`auth:${hash(email)}`);
    await session(admin.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
