import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { dataDirectory } from "@/lib/server/db";
import { authorize, fail, HttpError } from "@/lib/server/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const max = 8 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > max)
      throw new HttpError(413, "La photo doit faire moins de 8 Mo.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Photo manquante.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "La photo doit faire moins de 8 Mo.");
      }
      chunks.push(value);
    }
    let output: Buffer;
    try {
      const input = sharp(Buffer.concat(chunks), {
        limitInputPixels: 25_000_000,
        animated: false,
      });
      const metadata = await input.metadata();
      if (!["jpeg", "png", "webp", "avif"].includes(metadata.format || ""))
        throw new Error();
      output = await input
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new HttpError(
        400,
        "Choisissez une image JPG, PNG, WebP ou AVIF valide (25 mégapixels maximum).",
      );
    }
    const name = `${randomUUID()}.webp`;
    // En ligne (Vercel) : stockage Vercel Blob, seul stockage persistant.
    // En local : dossier data/uploads, servi par /media.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`photos/${name}`, output, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
      });
      return Response.json({ image: blob.url }, { status: 201 });
    }
    if (process.env.VERCEL)
      throw new HttpError(
        503,
        "Stockage des photos non configuré : reliez un Blob store au projet Vercel.",
      );
    await mkdir(path.join(dataDirectory, "uploads"), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(path.join(dataDirectory, "uploads", name), output, {
      flag: "wx",
    });
    return Response.json({ image: `/media/${name}` }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
