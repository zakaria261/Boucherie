import { actor, authorize, fail, HttpError, jsonBody, textField } from "@/lib/server/security";
import { adjustLoyalty } from "@/lib/server/loyalty";

export const runtime = "nodejs";

/** Ajustement motivé ou utilisation de la récompense (journalisés). */
export async function POST(request: Request, { params }: { params: Promise<{ phone: string }> }) {
  try {
    const admin = await authorize(request);
    const { phone } = await params;
    const body = await jsonBody(request);
    const account =
      body.type === "utilisation"
        ? await adjustLoyalty(phone, { type: "utilisation" }, actor(admin))
        : body.type === "ajustement"
          ? await adjustLoyalty(
              phone,
              { type: "ajustement", points: Number(body.points), reason: textField(body.reason, "Motif", 200, 3) },
              actor(admin),
            )
          : (() => {
              throw new HttpError(400, "Opération invalide.");
            })();
    return Response.json({ account });
  } catch (error) {
    return fail(error);
  }
}
