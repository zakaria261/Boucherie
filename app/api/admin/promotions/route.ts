import { randomUUID } from "node:crypto";
import { savePromotion } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { validatePromotion } from "@/lib/server/catalog";
import type { Promotion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await authorize(request);
    const promotion: Promotion = {
      ...validatePromotion(await jsonBody(request)),
      id: randomUUID(),
      sold: 0,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    savePromotion(promotion);
    return Response.json({ promotion }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
