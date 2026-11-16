import { getLoyaltyAccount, getOrder, getSettings } from "@/lib/server/db";
import { balance, loyaltyKey } from "@/lib/server/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Solde fidélité du client, à partir du lien secret d'une de ses commandes
 * (aucune recherche par numéro de téléphone n'est possible).
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const { loyalty } = await getSettings();
  const headers = { "Cache-Control": "private, no-store" };
  if (!loyalty.enabled) return Response.json({ enabled: false }, { headers });
  const order = /^[a-f0-9]{48}$/.test(token) ? await getOrder(token) : undefined;
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404, headers });
  const account = await getLoyaltyAccount(loyaltyKey(order.phone));
  return Response.json(
    {
      enabled: true,
      balance: account ? balance(account, loyalty) : 0,
      history: (account?.transactions || []).slice(-30).reverse().map(({ at, type, points, reason }) => ({ at, type, points, reason })),
      rules: { threshold: loyalty.threshold, reward: loyalty.reward, pointsPerEuro: loyalty.pointsPerEuro, validityMonths: loyalty.validityMonths, exclusions: loyalty.exclusions },
    },
    { headers },
  );
}
