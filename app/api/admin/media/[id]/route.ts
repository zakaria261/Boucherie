import { getMedia } from "@/lib/server/db";
import { authorizeRead, fail, HttpError } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Photo privée : réservée à l'équipe connectée, jamais mise en cache public. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorizeRead();
    const { id } = await params;
    if (!/^[a-f0-9]{32}$/.test(id)) throw new HttpError(404, "Photo introuvable.");
    const media = await getMedia(id);
    if (!media) throw new HttpError(404, "Photo introuvable.");
    return new Response(new Uint8Array(media.bytes), {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
