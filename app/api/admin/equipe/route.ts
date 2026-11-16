import { all, audit, exec, one } from "@/lib/server/db";
import { actor, authorize, authorizeRead, fail, hashPassword, HttpError, jsonBody, textField } from "@/lib/server/security";
import { validEmail } from "@/lib/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authorizeRead("owner");
    const team = await all<{ id: number; email: string; role: string; name: string }>(
      "SELECT id, email, role, name FROM admins ORDER BY id",
    );
    return Response.json({ team });
  } catch (error) {
    return fail(error);
  }
}

/** Ajoute un collaborateur : accès aux commandes, devis et produits, pas aux réglages. */
export async function POST(request: Request) {
  try {
    const admin = await authorize(request, "owner");
    const body = await jsonBody(request);
    const email = textField(body.email, "E-mail", 150).toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, "E-mail invalide.");
    const name = textField(body.name, "Prénom", 60, 2);
    const password = textField(body.password, "Mot de passe", 200, 12);
    if (await one("SELECT id FROM admins WHERE lower(email) = ?", email)) throw new HttpError(409, "Ce compte existe déjà.");
    const next = (await one<{ n: number }>("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM admins"))!.n;
    await exec("INSERT INTO admins (id, email, password, role, name) VALUES (?, ?, ?, 'staff', ?)", next, email, hashPassword(password), name);
    await audit(actor(admin), "equipe.ajout", "admin", String(next), { email });
    return Response.json({ id: next }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
