import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { slugify, validateProduct } from "@/lib/server/catalog";
import type { Product } from "@/lib/types";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const values = validateProduct(await jsonBody(request));
    const product: Product = {
      ...values,
      id: `${slugify(values.name) || "produit"}-${randomUUID().slice(0, 8)}`,
      version: 1,
    };
    db()
      .prepare("INSERT INTO products VALUES (?,?)")
      .run(product.id, JSON.stringify(product));
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
