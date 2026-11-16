import { audit, exec, getLoyaltyAccounts, getSettings } from "@/lib/server/db";
import { actor, authorize, authorizeRead, fail, HttpError, jsonBody } from "@/lib/server/security";
import { balance, parseLoyaltySettings } from "@/lib/server/loyalty";
import { refreshSite } from "@/lib/server/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comptes fidélité avec leur solde, recherche par nom ou téléphone. */
export async function GET(request: Request) {
  try {
    await authorizeRead();
    const q = (new URL(request.url).searchParams.get("q") || "").trim().toLowerCase();
    const { loyalty } = await getSettings();
    const accounts = (await getLoyaltyAccounts())
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.phone.includes(q.replace(/\D/g, "") || "§"))
      .slice(0, 100)
      .map((a) => ({ ...a, balance: balance(a, loyalty) }));
    return Response.json({ accounts, rules: loyalty }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error);
  }
}

/** Règles du programme : réservé au propriétaire. */
export async function PUT(request: Request) {
  try {
    const admin = await authorize(request, "owner");
    const body = await jsonBody(request);
    const settings = await getSettings();
    const loyalty = parseLoyaltySettings(body, settings.loyalty);
    const next = { ...settings, loyalty, version: settings.version + 1 };
    const result = await exec(
      "UPDATE settings SET data = ? WHERE id = 1 AND (data::jsonb->>'version')::int = ?",
      JSON.stringify(next),
      settings.version,
    );
    if (!result.rowsAffected) throw new HttpError(409, "Les réglages ont changé. Rechargez la page.");
    await audit(actor(admin), "fidelite.regles", "settings", "loyalty", loyalty);
    refreshSite();
    return Response.json({ rules: loyalty });
  } catch (error) {
    return fail(error);
  }
}
