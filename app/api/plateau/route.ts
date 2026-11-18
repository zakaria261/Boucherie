import { fail, HttpError, jsonBody, rateLimit, sameOrigin, textField } from "@/lib/server/security";
import { createRequestOrder } from "@/lib/server/orders";
import { one, saveOrder } from "@/lib/server/db";
import { getOffers } from "@/lib/server/offers";
import { parseListeRequest } from "@/lib/server/requests";
import { notifyOwnerNewOrder } from "@/lib/server/push";
import { BUDGET_RANGE, estimateLabel, MAX_PEOPLE, plateaux } from "@/lib/plateaux";
import { parisNow } from "@/lib/shop";
import type { FreeItem } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Commande d'un plateau à partager (fondue, pierrade, charcuterie).
 * Le client indique le nombre de personnes ou un budget ; le plateau se
 * commande au minimum la veille. Pas de prix : la boucherie le confirme.
 */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 20000);
    const plateau = plateaux.find((p) => p.id === body.plateauId);
    if (!plateau) throw new HttpError(409, "Ce plateau n’est plus proposé. Actualisez la page.");

    let size: string;
    if (body.mode === "budget") {
      const budget = Number(String(body.budget ?? "").replace(",", "."));
      if (!Number.isFinite(budget) || budget < BUDGET_RANGE[0] || budget > BUDGET_RANGE[1])
        throw new HttpError(400, `Indiquez un budget entre ${BUDGET_RANGE[0]} et ${BUDGET_RANGE[1]} €.`);
      size = `Budget : ${budget.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
    } else {
      const people = Number(body.people);
      if (!Number.isInteger(people) || people < 1 || people > MAX_PEOPLE)
        throw new HttpError(400, `Indiquez un nombre de personnes entre 1 et ${MAX_PEOPLE}.`);
      size = `Pour ${people} personne${people > 1 ? "s" : ""} (${estimateLabel(plateau, people)})`;
    }

    let option = "";
    if (plateau.options.length) {
      option = plateau.options.find((o) => o === body.option) || "";
      if (!option) throw new HttpError(400, "Choisissez une version du plateau.");
    }
    let marinade = "";
    if (body.marinade) {
      const { marinades } = await getOffers();
      const found = marinades.find((m) => m.visible && m.id === body.marinade);
      if (!found || !plateau.marinatedOption || option !== plateau.marinatedOption)
        throw new HttpError(400, "Marinade invalide.");
      marinade = found.name;
    }

    const name = `${plateau.name}${option ? ` (${option.toLowerCase()})` : ""}`;
    const draft = parseListeRequest({ ...body, items: [{ name, quantity: "1", unit: "piece" }] });
    // Au minimum la veille pour le lendemain.
    if (draft.date <= parisNow().date)
      throw new HttpError(400, "Les plateaux se commandent au minimum la veille : choisissez un retrait à partir de demain.");
    const item: FreeItem = {
      kind: "libre",
      name,
      quantity: 1,
      unit: "piece",
      note: [size, marinade && `Marinade : ${marinade}`].filter(Boolean).join(" — "),
      price: null,
      total: null,
    };
    const prior = await one<{ id: string; token: string }>("SELECT id, token FROM orders WHERE request_key = ?", draft.key);
    if (prior) return Response.json({ id: prior.id, token: prior.token, repeated: true });
    await rateLimit(`plateau:${draft.phone.replace(/\D/g, "")}`, 6, 60 * 60 * 1000);
    await rateLimit("orders-global", 150, 60 * 60 * 1000);
    const { order, created } = await createRequestOrder({
      ...draft,
      notes: textField(body.notes ?? "", "Précisions", 1000, 0),
      origin: "plateau",
      items: [item],
    });
    if (created) {
      order.push = await notifyOwnerNewOrder(order).catch(() => "failed" as const);
      await saveOrder(order);
    }
    return Response.json({ id: order.id, token: order.token }, { status: created ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}
