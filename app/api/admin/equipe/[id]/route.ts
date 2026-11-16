import { audit, exec, transaction } from "@/lib/server/db";
import { actor, authorize, fail, HttpError } from "@/lib/server/security";

export const runtime = "nodejs";

/** Retire un collaborateur et ferme ses sessions. Le propriétaire ne peut pas être retiré. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorize(request, "owner");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id === admin.id) throw new HttpError(400, "Compte invalide.");
    await transaction(async () => {
      const result = await exec("DELETE FROM admins WHERE id = ? AND role = 'staff'", id);
      if (!result.rowsAffected) throw new HttpError(404, "Collaborateur introuvable.");
      await exec("DELETE FROM sessions WHERE admin_id = ?", id);
      await exec("DELETE FROM push_subscriptions WHERE admin_id = ?", id);
    });
    await audit(actor(admin), "equipe.retrait", "admin", String(id));
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
