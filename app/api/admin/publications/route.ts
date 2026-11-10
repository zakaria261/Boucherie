import { randomUUID } from "node:crypto";
import { savePost } from "@/lib/server/db";
import { authorize, fail, jsonBody } from "@/lib/server/security";
import { slugify, validatePost } from "@/lib/server/catalog";
import type { Post } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await authorize(request);
    const values = await validatePost(await jsonBody(request));
    const now = new Date().toISOString();
    const post: Post = {
      ...values,
      id: `${slugify(values.title) || "publication"}-${randomUUID().slice(0, 6)}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await savePost(post);
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
