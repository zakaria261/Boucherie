import webpush from "web-push";
import { db, getSettings, kvGet, kvSet } from "./db";
import type { Order } from "../types";
import { formatTime, longDate, money } from "../shop";

// Notifications Web Push de l'application du boucher. Les clés VAPID sont
// générées une fois et conservées dans la base : aucun service tiers payant.
// Variables facultatives : VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.

export function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  const saved = kvGet("vapid");
  if (saved) return JSON.parse(saved) as { publicKey: string; privateKey: string };
  const keys = webpush.generateVAPIDKeys();
  kvSet("vapid", JSON.stringify(keys));
  return keys;
}

type Subscription = webpush.PushSubscription;

export function saveSubscription(adminId: number, sub: Subscription) {
  db()
    .prepare(
      "INSERT INTO push_subscriptions VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET data = excluded.data, admin_id = excluded.admin_id",
    )
    .run(sub.endpoint, adminId, JSON.stringify(sub), Date.now());
}

export function removeSubscription(endpoint: string) {
  db().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function subscriptionCount() {
  return (
    db().prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get() as {
      n: number;
    }
  ).n;
}

export function hasSubscription(endpoint: string) {
  return !!db()
    .prepare("SELECT 1 FROM push_subscriptions WHERE endpoint = ?")
    .get(endpoint);
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
  const subs = db().prepare("SELECT endpoint, data FROM push_subscriptions").all() as {
    endpoint: string;
    data: string;
  }[];
  if (!subs.length) return "not-configured";
  const keys = vapidKeys();
  const contact = getSettings().email || "contact@example.com";
  let delivered = 0;
  await Promise.all(
    subs.map(async ({ endpoint, data }) => {
      try {
        await webpush.sendNotification(JSON.parse(data), JSON.stringify(payload), {
          vapidDetails: {
            subject: `mailto:${contact}`,
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
          },
          TTL: 60 * 60 * 6,
          urgency: "high",
          timeout: 8000,
        });
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Abonnement expiré ou révoqué : on le supprime.
        if (status === 404 || status === 410) removeSubscription(endpoint);
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
