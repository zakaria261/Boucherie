import webpush from "web-push";
import { all, exec, getSettings, kvGet, kvSet, one } from "./db";
import type { Order } from "../types";
import { formatTime, longDate, money } from "../shop";

// Notifications Web Push de l'application du boucher. Les clés VAPID sont
// générées une fois et conservées dans la base : aucun service tiers payant.
// Variables facultatives : VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.

export async function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  const saved = await kvGet("vapid");
  if (saved)
    return JSON.parse(saved) as { publicKey: string; privateKey: string };
  const keys = webpush.generateVAPIDKeys();
  await kvSet("vapid", JSON.stringify(keys));
  return keys;
}

type Subscription = webpush.PushSubscription;

export async function saveSubscription(adminId: number, sub: Subscription) {
  await exec(
    "INSERT INTO push_subscriptions VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET data = excluded.data, admin_id = excluded.admin_id",
    sub.endpoint,
    adminId,
    JSON.stringify(sub),
    Date.now(),
  );
}

export async function removeSubscription(endpoint: string) {
  await exec("DELETE FROM push_subscriptions WHERE endpoint = ?", endpoint);
}

export async function subscriptionCount() {
  return Number(
    (await one<{ n: number }>("SELECT COUNT(*) AS n FROM push_subscriptions"))!
      .n,
  );
}

export async function hasSubscription(endpoint: string) {
  return !!(await one(
    "SELECT 1 FROM push_subscriptions WHERE endpoint = ?",
    endpoint,
  ));
}

/**
 * Envoie à tous les appareils abonnés. Renvoie « sent » si au moins un envoi a
 * été accepté par le service de notification, jamais par simple supposition.
 */
export async function pushAll(payload: {
  title: string;
  body: string;
  url: string;
  tag?: string;
}): Promise<"sent" | "not-configured" | "failed"> {
  const subs = await all<{ endpoint: string; data: string }>(
    "SELECT endpoint, data FROM push_subscriptions",
  );
  if (!subs.length) return "not-configured";
  const keys = await vapidKeys();
  const contact = (await getSettings()).email || "contact@example.com";
  let delivered = 0;
  await Promise.all(
    subs.map(async ({ endpoint, data }) => {
      try {
        await webpush.sendNotification(
          JSON.parse(data),
          JSON.stringify(payload),
          {
            vapidDetails: {
              subject: `mailto:${contact}`,
              publicKey: keys.publicKey,
              privateKey: keys.privateKey,
            },
            TTL: 60 * 60 * 6,
            urgency: "high",
            timeout: 8000,
          },
        );
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Abonnement expiré ou révoqué : on le supprime.
        if (status === 404 || status === 410)
          await removeSubscription(endpoint);
      }
    }),
  );
  return delivered ? "sent" : "failed";
}

export function notifyOwnerNewOrder(order: Order) {
  const count = order.items.length;
  return pushAll({
    title: `Nouvelle commande ${order.id}`,
    body: `${order.name} · ${count} produit${count > 1 ? "s" : ""} · ${money(
      order.total,
    )}\nRetrait ${longDate(order.date)}${order.time ? ` à ${formatTime(order.time)}` : ""}`,
    url: `/admin/commandes/${order.id}`,
    tag: order.id,
  });
}
