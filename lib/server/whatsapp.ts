import { money } from "@/lib/shop";
import type { Order } from "@/lib/types";
import { whatsappNumber } from "@/lib/whatsapp";
import { getSettings } from "./db";

type Delivery = "sent" | "not-configured" | "not-requested" | "failed";

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (!accessToken || !phoneNumberId || !apiVersion) return null;
  return { accessToken, phoneNumberId, apiVersion };
}

async function sendTemplate(
  recipient: string,
  template: string | undefined,
  parameters: string[],
): Promise<Exclude<Delivery, "not-requested">> {
  const connection = config();
  const to = whatsappNumber(recipient);
  if (!connection || !to || !template) return "not-configured";

  try {
    const response = await fetch(
      `https://graph.facebook.com/${connection.apiVersion}/${connection.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" },
            components: [
              {
                type: "body",
                parameters: parameters.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

function trackingUrl(order: Order) {
  const origin = process.env.APP_ORIGIN;
  return origin?.startsWith("https://")
    ? `${origin}/commande/suivi/${order.token}`
    : "";
}

export async function notifyNewOrder(order: Order) {
  const settings = getSettings();
  const summary = [order.id, order.name, order.date, money(order.total)];
  const owner = await sendTemplate(
    settings.whatsapp,
    process.env.WHATSAPP_OWNER_TEMPLATE,
    summary,
  );
  const customer = order.whatsappOptIn
    ? await sendTemplate(order.phone, process.env.WHATSAPP_CUSTOMER_TEMPLATE, [
        order.name,
        order.id,
        order.date,
        trackingUrl(order),
      ])
    : "not-requested";
  return { owner, customer } as const;
}

export async function notifyStatusUpdate(order: Order) {
  if (!order.whatsappOptIn) return "not-requested" as const;
  return sendTemplate(order.phone, process.env.WHATSAPP_STATUS_TEMPLATE, [
    order.name,
    order.id,
    order.status,
    trackingUrl(order),
  ]);
}
