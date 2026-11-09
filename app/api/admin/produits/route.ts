import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { validateProduct } from "@/lib/server/catalog";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const values = validateProduct(await jsonBody(request));
    const slug = values.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const product = {
      ...values,
      id: `${slug}-${randomUUID().slice(0, 8)}`,
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
