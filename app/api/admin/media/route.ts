import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import { actor, authorize, fail, HttpError } from "@/lib/server/security";
import { audit, saveMedia } from "@/lib/server/db";

export const runtime = "nodejs";

/**
 * Photo d'une commande (bon papier, capture d'écran). Ré-encodée en WebP
 * (les métadonnées et tout contenu non image sont supprimés), stockée dans la
 * base et servie uniquement à l'équipe connectée. Une photo identique déjà
 * importée n'est pas dupliquée.
 */
export async function POST(request: Request) {
  try {
    const admin = await authorize(request);
    const max = 8 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > max) throw new HttpError(413, "La photo doit faire moins de 8 Mo.");
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
      const input = sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000, animated: false });
      const meta = await input.metadata();
      if (!["jpeg", "png", "webp", "avif", "heif"].includes(meta.format || "")) throw new Error();
      output = await input.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    } catch {
      throw new HttpError(400, "Choisissez une photo JPG, PNG, WebP, AVIF ou HEIC valide.");
    }
    const hash = createHash("sha256").update(output).digest("hex");
    const { id, duplicate } = await saveMedia(randomBytes(16).toString("hex"), hash, "image/webp", new Uint8Array(output));
    if (!duplicate) await audit(actor(admin), "photo.import", "media", id);
    return Response.json({ id, duplicate }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    return fail(error);
  }
}
