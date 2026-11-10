import { pushAll } from "@/lib/server/push";
import { authorize, fail, rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await authorize(request);
    rateLimit(`push-test:${admin.id}`, 10, 10 * 60 * 1000);
    const result = await pushAll({
      title: "Faubourg Pro",
      body: "Les notifications fonctionnent sur cet appareil.",
      url: "/admin",
      tag: "test",
    });
    return Response.json({ result });
  } catch (error) {
    return fail(error);
  }
}
