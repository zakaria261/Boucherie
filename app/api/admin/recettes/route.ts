import { randomUUID } from "node:crypto";
import { saveRecipe } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { slugify, validateRecipe } from "@/lib/server/catalog";
import type { Recipe } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await authorize(request);
    const values = validateRecipe(await jsonBody(request, 60000));
    const recipe: Recipe = {
      ...values,
      id: `${slugify(values.title) || "recette"}-${randomUUID().slice(0, 6)}`,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    saveRecipe(recipe);
    return Response.json({ recipe }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
