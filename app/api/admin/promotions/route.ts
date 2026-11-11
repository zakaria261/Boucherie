import { refreshSite } from "@/lib/server/refresh";
import { randomUUID } from "node:crypto";
import { savePromotion } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { validatePromotion } from "@/lib/server/catalog";
import type { Promotion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await authorize(request);
    const promotion: Promotion = {
      ...(await validatePromotion(await jsonBody(request))),
      id: randomUUID(),
      sold: 0,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await savePromotion(promotion);
    refreshSite();
    return Response.json({ promotion }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
