// Service worker de Faubourg Pro, servi depuis /admin/sw.js pour que son
// périmètre soit /admin/. Il ne met aucune donnée en cache : les commandes et
// informations clients restent toujours lues en direct, derrière la connexion.
const source = String.raw`
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Hors connexion</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:12px;padding:24px;text-align:center;font:17px -apple-system,system-ui,sans-serif;background:#f2f2f7;color:#000}button{font:inherit;font-weight:600;color:#fff;background:#7a1f2b;border:0;border-radius:12px;padding:14px 22px}@media(prefers-color-scheme:dark){body{background:#000;color:#fff}}</style><h1 style="font-size:22px;margin:0">Pas de connexion</h1><p style="margin:0;color:#8e8e93">Faubourg Pro a besoin d’Internet pour afficher vos commandes.</p><button onclick="location.reload()">Réessayer</button></html>',
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Faubourg Pro";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        tag: data.tag,
        icon: "/app-icons/icon-192.png",
        badge: "/app-icons/icon-192.png",
        data: { url: data.url || "/admin" },
      }),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: "refresh-orders" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin", self.location.origin);
  if (!target.pathname.startsWith("/admin")) target.pathname = "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin + "/admin") && "focus" in client) {
          return client.focus().then((c) => c.navigate(target.href));
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "push-expired" }))),
  );
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/admin/",
    },
  });
}
