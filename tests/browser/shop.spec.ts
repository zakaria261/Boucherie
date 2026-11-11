import {
  test,
  expect,
  devices,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = {
  email: "proprietaire@example.com",
  password: "Une-boucherie-2026-solide!",
};
const headers = { Origin: origin };
const sample = {
  name: "Pièce du test artisan",
  price: 2299,
  category: "Bœuf",
  image: "/images/hero.jpg",
  description: "Une pièce pour vérifier le catalogue.",
  ingredients: "",
  badge: "Sélection test",
  published: false,
  available: true,
  featured: false,
  grill: true,
};
const COTE = "côte-à-l-os-maturé";

async function login(page: Page, next = "/admin") {
  await page.goto(`/admin/connexion?suite=${encodeURIComponent(next)}`);
  await page.getByLabel("Votre e-mail").fill(auth.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(auth.password);
  await page.getByRole("button", { name: "Entrer dans ma boutique" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, "\\/")}$`));
}
async function loginApi(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", { headers, data: auth });
  expect(response.ok()).toBeTruthy();
}
/** Premier créneau libre proposé aux clients. */
async function freeSlot(request: APIRequestContext, sameDay = false) {
  const response = await request.get(`/api/creneaux${sameDay ? "?jourMeme=1" : ""}`);
  const { dates } = (await response.json()) as {
    dates: { date: string; slots: { time: string; full: boolean }[] }[];
  };
  for (const d of dates) {
    const slot = d.slots.find((s) => !s.full);
    if (slot) return { date: d.date, time: slot.time };
  }
  throw new Error("Aucun créneau libre");
}
async function product(request: APIRequestContext, id: string) {
  const html = await request.get(`/boutique/${encodeURIComponent(id)}`);
  expect(html.ok()).toBeTruthy();
}

test.beforeAll(async ({ request }) => {
  const setup = await request.post("/api/auth/setup", {
    headers,
    data: { ...auth, token: "test-installation-token-only" },
  });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
});

test("site public : pages, recherche, filtres et SEO", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Boucherie du Faubourg");
  await expect(page.getByText("Votre artisan boucher au cœur d’Amiens.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Commander" })).toHaveAttribute("href", "/boutique");
  await expect(page.getByRole("link", { name: "Voir les promotions" })).toBeVisible();
  await expect(page.locator(".steps li")).toHaveCount(3);
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "La boutique", exact: true })
    .click();
  await expect(page).toHaveURL("/boutique");
  await expect(page.locator(".product")).toHaveCount(58);
  await page.getByRole("button", { name: /^Volailles/ }).click();
  await expect(page.locator(".product")).toHaveCount(20);
  await page.getByLabel("Rechercher dans la boutique").fill("curry");
  await expect(page.locator(".product")).toHaveCount(2);
  await page.getByLabel("Rechercher dans la boutique").fill("introuvable");
  await expect(page.getByText("Aucun produit pour cette envie.")).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(page.locator(".product")).toHaveCount(58);
  for (const url of [
    "/barbecue",
    "/promotions",
    "/recettes",
    "/recettes/boeuf-bourguignon",
    "/morceaux",
    "/que-cuisiner",
    "/actualites",
    "/notre-maison",
    "/contact",
    "/informations",
    "/mentions-legales",
    "/mes-commandes",
  ]) {
    await page.goto(url);
    await expect(page.locator("h1").first(), url).toBeVisible();
  }
  // Recette : quantités recalculées selon le nombre de convives.
  await page.goto("/recettes/boeuf-bourguignon");
  await expect(page.locator(".ingredients li").first()).toContainText("800 g");
  await page.getByRole("button", { name: "Plus de convives" }).click();
  await page.getByRole("button", { name: "Plus de convives" }).click();
  await page.getByRole("button", { name: "Plus de convives" }).click();
  await expect(page.locator(".ingredients li").first()).toContainText("1 200 g");
  // Carte des morceaux : la sélection affiche le morceau et ses produits.
  await page.goto("/morceaux");
  await page.getByRole("button", { name: "Paleron" }).first().click();
  await expect(page.locator(".cut-info h2")).toHaveText("Paleron");
  await expect(page.locator(".cut-info .product")).toHaveCount(1);
  // SEO
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/boutique/");
  expect(sitemap).toContain("/recettes/boeuf-bourguignon");
  const old = await request.get("/boutique-en-ligne", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe("/boutique");
  expect(errors).toEqual([]);
});

test("accès boucher fermé, CSRF et validation côté serveur", async ({ request, page }) => {
  await page.goto("/admin/produits");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  expect((await request.post("/api/admin/produits", { headers, data: sample })).status()).toBe(401);
  expect((await request.get("/api/admin/orders")).status()).toBe(401);
  expect((await request.get("/api/admin/sauvegarde")).status()).toBe(401);
  expect(
    (await request.post("/api/auth/login", { headers: { Origin: "https://autre-site.example" }, data: auth })).status(),
  ).toBe(403);
  expect(
    (await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } })).status(),
  ).toBe(403);
  await loginApi(request);
  expect((await request.post("/api/admin/produits", { headers, data: { ...sample, price: -100 } })).status()).toBe(400);
  expect(
    (await request.post("/api/admin/produits", { headers, data: { ...sample, image: "javascript:alert(1)" } })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/admin/upload", {
        headers: { ...headers, "Content-Type": "image/png" },
        data: Buffer.from('<svg onload="alert(1)"></svg>'),
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/admin/orders")).status()).toBe(200);
});

test("commande enregistrée : prix serveur, anti-doublon, stock, créneau, sans WhatsApp", async ({ request }) => {
  await loginApi(request);
  const created = await request.post("/api/admin/produits", {
    headers,
    data: { ...sample, name: "Pièce de contrôle API", published: true, stock: 1000 },
  });
  const { product: p } = await created.json();
  const { date, time } = await freeSlot(request);
  const order = {
    requestKey: crypto.randomUUID(),
    name: "Client test",
    email: "client@example.com",
    phone: "0612345678",
    whatsappOptIn: false,
    date,
    time,
    items: [{ id: p.id, grams: 500, quantity: 1, price: 1 }],
  };
  // Prix falsifié refusé.
  expect((await request.post("/api/orders", { headers, data: order })).status()).toBe(409);
  const valid = { ...order, items: [{ ...order.items[0], price: 2299 }] };
  const one = await request.post("/api/orders", { headers, data: valid });
  expect(one.status()).toBe(201);
  const first = await one.json();
  // Même tentative rejouée : même commande, pas de doublon ni de double réservation.
  const two = await request.post("/api/orders", { headers, data: valid });
  expect((await two.json()).id).toBe(first.id);
  // Stock : 1 kg suivi, 500 g réservés ; 1 kg de plus est refusé.
  const tooMuch = await request.post("/api/orders", {
    headers,
    data: { ...valid, requestKey: crypto.randomUUID(), items: [{ ...valid.items[0], grams: 1000 }] },
  });
  expect(tooMuch.status()).toBe(409);
  expect((await tooMuch.json()).error).toContain("Il ne reste que 500 g");
  // Date passée et créneau inexistant refusés.
  expect(
    (await request.post("/api/orders", { headers, data: { ...valid, requestKey: crypto.randomUUID(), date: "2020-01-01" } })).status(),
  ).toBe(400);
  expect(
    (await request.post("/api/orders", { headers, data: { ...valid, requestKey: crypto.randomUUID(), time: "03:00" } })).status(),
  ).toBe(400);
  // La commande est visible côté boucher, avec son historique.
  const { orders } = await (await request.get("/api/admin/orders")).json();
  const saved = orders.find((o: { id: string }) => o.id === first.id);
  expect(saved.status).toBe("Nouvelle");
  expect(saved.items[0].total).toBe(1150);
  expect(saved.history).toHaveLength(1);
  // Transition incohérente refusée, annulation remet en stock.
  expect(
    (await request.patch(`/api/admin/orders/${first.id}`, { headers, data: { status: "Retirée", updatedAt: saved.updatedAt } })).status(),
  ).toBe(409);
  const cancel = await request.patch(`/api/admin/orders/${first.id}`, {
    headers,
    data: { status: "Annulée", updatedAt: saved.updatedAt },
  });
  expect(cancel.status()).toBe(200);
  const again = await request.post("/api/orders", {
    headers,
    data: { ...valid, requestKey: crypto.randomUUID(), items: [{ ...valid.items[0], grams: 1000 }] },
  });
  expect(again.status()).toBe(201);
  // Suivi public par lien secret uniquement.
  expect((await request.get(`/api/orders/${first.token}`)).status()).toBe(200);
  expect((await request.get(`/api/orders/${"0".repeat(48)}`)).status()).toBe(404);
  await product(request, COTE);
});

test("parcours client sur iPhone puis préparation dans l’application du boucher", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto(`/boutique/${encodeURIComponent(COTE)}`);
  await page.getByRole("button", { name: "1 kg", exact: true }).click();
  await page.getByRole("button", { name: /Ajouter ·/ }).click();
  await page.reload();
  await page.getByRole("button", { name: /Voir mon panier/ }).click();
  await expect(page.locator(".cart-summary")).toContainText("34,99");
  await page.getByRole("button", { name: "Augmenter Côte à l'os maturé" }).click();
  await expect(page.locator(".cart-summary")).toContainText("69,98");
  await page.getByRole("link", { name: "Choisir mon retrait" }).click();
  await expect(page).toHaveURL("/commande");
  await page.getByLabel("Nom complet").fill("Client du parcours");
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Instructions pour votre boucher").fill("Couper en deux, merci");
  await page.locator(".slot-grid button:not([disabled])").first().click();
  // Aucun numéro WhatsApp n'est configuré : la commande passe quand même.
  await page.getByRole("button", { name: "Confirmer ma commande" }).click();
  await expect(page).toHaveURL(/\/commande\/suivi\/[a-f0-9]{48}\?confirmation=1/);
  await expect(page.getByText("Commande enregistrée")).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Commande reçue");
  await expect(page.getByText("Facultatif : écrire aussi sur WhatsApp")).toHaveCount(0);
  const id = (await page.locator(".confirm-banner b").textContent())!;
  const tracking = page.url().split("?")[0];
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Le panier est vidé et la commande retrouvée dans « Mes commandes ».
  await page.goto("/mes-commandes");
  await expect(page.getByText(id)).toBeVisible();

  // Côté boucher, sur iPhone.
  const admin = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const app = await admin.newPage();
  await login(app);
  await expect(app.getByRole("heading", { name: "Aujourd’hui", exact: true })).toBeVisible();
  await app.getByRole("navigation", { name: "Navigation de l’application" }).getByRole("link", { name: /Commandes/ }).click();
  await app.getByRole("tab", { name: /Nouvelles/ }).click();
  await app.getByRole("link", { name: new RegExp(`Client du parcours #${id.replace("FB-", "")}`) }).click();
  await expect(app.getByText("Couper en deux, merci")).toBeVisible();
  await expect(app.locator(".prep-qty")).toHaveText("2×");
  await app.getByRole("button", { name: "Accepter la commande" }).click();
  await expect(app.getByRole("button", { name: "Commencer la préparation" })).toBeVisible();
  await app.getByRole("button", { name: "Commencer la préparation" }).click();
  await app.getByRole("button", { name: "Marquer comme prête" }).click();
  await expect(app.getByRole("button", { name: "Marquer comme retirée" })).toBeVisible();
  // Rien n'est masqué par la barre d'actions ou la barre d'onglets.
  const bar = await app.locator(".action-bar").boundingBox();
  const tabs = await app.locator(".tabbar").boundingBox();
  expect(bar!.y + bar!.height).toBeLessThanOrEqual(tabs!.y + 1);
  // Le client voit l'avancement.
  await page.goto(tracking);
  await expect(page.locator("h1")).toHaveText("Votre commande est prête");
  // Annulation : confirmation obligatoire.
  await app.getByRole("button", { name: "Annuler la commande" }).click();
  await expect(app.getByRole("dialog", { name: "Annuler la commande" })).toBeVisible();
  await app.getByRole("button", { name: "Garder la commande" }).click();
  await app.getByRole("button", { name: "Marquer comme retirée" }).click();
  await app.getByLabel("Montant encaissé (facultatif)").fill("71,20");
  await app.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(app.getByText("Commande terminée")).toBeVisible();
  await expect(app.getByText("71,20 €")).toBeVisible();
  await ctx.close();
  await admin.close();
});

test("modifications rapides et promotion flash depuis l’iPhone, visibles sur le site", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const app = await ctx.newPage();
  await login(app, "/admin/produits");
  await app.getByLabel("Rechercher un produit").fill("Merguez maison");
  await app.locator(".product-row").first().click();
  const sheet = app.getByRole("dialog", { name: "Merguez maison" });
  await sheet.getByLabel("Prix en euros").fill("11,50");
  await sheet.getByLabel("Suivre le stock").check();
  await sheet.getByRole("button", { name: "Augmenter stock" }).click();
  await sheet.getByRole("button", { name: "Augmenter stock" }).click();
  // Fermer avec des modifications demande une confirmation.
  await sheet.getByRole("button", { name: "Annuler" }).click();
  await expect(sheet.getByText("Abandonner les modifications non enregistrées ?")).toBeVisible();
  await sheet.getByRole("button", { name: "Continuer" }).click();
  await sheet.getByRole("button", { name: "Enregistrer", exact: true }).first().click();
  await expect(app.getByRole("status").filter({ hasText: "Enregistré" })).toBeVisible();
  const site = await ctx.newPage();
  await site.goto("/boutique/merguez-maison");
  await expect(site.locator(".product-detail-price")).toContainText("11,50");
  await expect(site.locator(".product-buy .stock")).toHaveText("Reste 1 kg");

  // Indisponible depuis l'iPhone : bouton désactivé sur le site.
  await app.locator(".product-row").first().click();
  await app.getByRole("dialog", { name: "Merguez maison" }).getByLabel("Disponible à la commande").uncheck();
  // Attendre la réponse du serveur : le « Enregistré » précédent peut encore être affiché.
  const saved = app.waitForResponse(
    (r) => r.url().includes("/api/admin/produits/") && r.request().method() === "PATCH",
  );
  await app.getByRole("dialog", { name: "Merguez maison" }).getByRole("button", { name: "Enregistrer", exact: true }).first().click();
  expect((await saved).status()).toBe(200);
  await site.goto("/boutique/merguez-maison");
  await expect(site.getByRole("button", { name: /Ajouter ·/ })).toBeDisabled();

  // Promotion flash.
  await app.goto("/admin/publications");
  await app.getByRole("button", { name: "Nouvelle publication" }).click();
  await app.getByRole("button", { name: /Promotion flash/ }).click();
  const promo = app.getByRole("dialog", { name: "Nouvelle promotion" });
  await promo.getByLabel("Choisir le produit").fill("Gigot");
  await promo.locator(".product-row").first().click();
  await promo.getByLabel("Nouveau prix en euros").fill("14,90");
  await expect(promo.locator(".promo-preview")).toContainText("14,90");
  await promo.getByRole("button", { name: "Publier maintenant" }).click();
  await expect(app.getByRole("status").filter({ hasText: "Promotion publiée" })).toBeVisible();
  await site.goto("/promotions");
  await expect(site.locator(".product", { hasText: "Gigot" })).toContainText("14,90");
  await site.goto("/");
  await expect(site.locator("#promotions")).toContainText("Gigot");
  // Arrêt immédiat.
  await app.getByRole("tab", { name: "Promotions" }).click();
  await app.getByRole("button", { name: /Gigot/ }).click();
  await app.getByRole("button", { name: "Arrêter maintenant" }).click();
  await expect(app.getByRole("status").filter({ hasText: "Promotion arrêtée" })).toBeVisible();
  const html = await (await request.get("/promotions")).text();
  expect(html).not.toContain("14,90");
  await ctx.close();
});

test("le boucher crée, photographie, publie et supprime un produit et une actualité", async ({ page }) => {
  await login(page, "/admin/produits");
  await page.getByRole("link", { name: "Ajouter un produit" }).click();
  await page.getByLabel("Nom du produit", { exact: true }).fill(sample.name);
  await page.getByLabel("Prix au kilogramme (€)").fill("22.99");
  await page.getByLabel("Description", { exact: true }).fill(sample.description);
  await page.getByLabel("Photo du produit", { exact: true }).setInputFiles("public/images/merguez-maison.jpg");
  await expect(page.getByRole("button", { name: "Changer la photo" })).toBeVisible();
  await page.getByRole("button", { name: "Épaisseur" }).click();
  await page.getByLabel("Publier le produit").check();
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page).toHaveURL(/\/admin\/produits\/piece-du-test/);
  const id = decodeURIComponent(page.url().split("/").pop()!);
  await page.goto(`/boutique/${encodeURIComponent(id)}`);
  await expect(page.locator("h1")).toHaveText(sample.name);
  await expect(page.locator(".product-detail-price")).toContainText("22,99");
  await expect(page.getByRole("button", { name: "2 cm" })).toBeVisible();
  // Photo importée, servie optimisée (AVIF/WebP) via /_next/image.
  const src = (await page.locator(".product-detail-photo img").getAttribute("src"))!;
  expect(new URL(src, "http://x").searchParams.get("url") ?? src).toMatch(/^\/media\//);
  await page.goto(`/admin/produits/${encodeURIComponent(id)}`);
  await page.getByLabel("Prix au kilogramme (€)").fill("24.50");
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Produit enregistré" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Prix au kilogramme (€)")).toHaveValue("24.50");
  await page.getByLabel("Publier le produit").uncheck();
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Produit enregistré" })).toBeVisible();
  expect((await page.request.get(`/boutique/${encodeURIComponent(id)}`)).status()).toBe(404);
  await page.getByRole("button", { name: "Supprimer ce produit" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page).toHaveURL("/admin/produits");
  await page.getByLabel("Rechercher un produit").fill(sample.name);
  await expect(page.getByText("Aucun produit trouvé.")).toBeVisible();

  // Actualité mise en avant sur l'accueil.
  await page.goto("/admin/publications/actualites/nouvelle?type=Arrivage");
  await page.getByLabel("Titre").fill("Arrivage d’agneau du Limousin");
  await page.getByLabel("Description").fill("Belles épaules et gigots disponibles cette semaine.");
  await page.getByLabel("Mettre en avant sur l’accueil").check();
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page).toHaveURL(/actualites\/arrivage-d-agneau/);
  await page.goto("/");
  await expect(page.getByText("Arrivage d’agneau du Limousin")).toBeVisible();
});

test("réglages de la boutique et horaires de retrait", async ({ page }) => {
  await login(page, "/admin/plus");
  await page.getByRole("link", { name: /Ma boutique/ }).click();
  await page.getByLabel("Message du bandeau supérieur").fill("Votre artisan vous accueille à Amiens");
  await page.getByLabel("Téléphone", { exact: true }).fill("03 00 00 00 00");
  await page.getByLabel("Numéro WhatsApp de la boucherie").fill("06 12 34 56 78");
  await page.getByLabel("Informations complémentaires").fill("Fermé le 25 décembre");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByRole("status").filter({ hasText: "enregistrées" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Téléphone", { exact: true })).toHaveValue("03 00 00 00 00");
  await page.goto("/contact");
  await expect(page.locator(".announcement")).toContainText("Votre artisan vous accueille à Amiens");
  await expect(page.getByText("Fermé le 25 décembre")).toBeVisible();
  await expect(page.getByRole("link", { name: "Écrire sur WhatsApp" })).toHaveAttribute("href", /wa\.me\/33612345678/);

  await page.goto("/admin/plus/retraits");
  await page.getByLabel("Dimanche ouvert", { exact: true }).uncheck();
  await page.getByLabel("Horaires vérifiés").check();
  await page.getByRole("button", { name: "Enregistrer les horaires" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Horaires enregistrés" })).toBeVisible();
  await page.goto("/contact");
  await expect(page.locator(".hours-card")).toContainText("DimancheFermé");
});

test("PWA Faubourg Pro, affichage mobile et mode sombre", async ({ browser, request }) => {
  const manifest = await (await request.get("/admin/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Faubourg Pro");
  expect(manifest.start_url).toBe("/admin");
  expect(manifest.scope).toBe("/admin/");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
  const sw = await request.get("/admin/sw.js");
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(await sw.text()).toContain("notificationclick");

  for (const [name, device] of [
    ["iPhone SE", devices["iPhone SE"]],
    ["iPhone 13", devices["iPhone 13"]],
    ["Pixel 7", devices["Pixel 7"]],
    ["iPad", devices["iPad (gen 7)"]],
  ] as const) {
    const ctx = await browser.newContext({ ...device, baseURL: origin, colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/admin/connexion");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin/manifest.webmanifest");
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Faubourg Pro");
    await login(page);
    for (const url of [
      "/",
      "/boutique",
      "/boutique/merguez-maison",
      "/commande",
      "/recettes/boeuf-bourguignon",
      "/morceaux",
      "/contact",
      "/admin",
      "/admin/commandes",
      "/admin/produits",
      "/admin/stock",
      "/admin/publications",
      "/admin/plus",
      "/admin/plus/boutique",
      "/admin/plus/retraits",
      "/admin/produits/nouveau",
    ]) {
      await page.goto(url);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${name} ${url}`,
      ).toBe(true);
    }
    await page.goto("/admin");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await page.screenshot({ path: `test-results/${name.replace(/\s/g, "-")}-admin.png` });
    await ctx.close();
  }
});

test("déconnexion et changement de mot de passe invalident les sessions", async ({ page, request }) => {
  await login(page);
  await loginApi(request);
  await page.goto("/admin/plus/compte");
  await page.getByLabel("Mot de passe actuel").fill(auth.password);
  await page.getByLabel("Nouveau mot de passe").fill("Nouveau-mot-de-passe-2026!");
  await page.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mot de passe mis à jour" })).toBeVisible();
  expect((await request.post("/api/admin/produits", { headers, data: sample })).status()).toBe(401);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/admin/connexion");
  await page.goto("/admin/commandes");
  await expect(page).toHaveURL(/\/admin\/connexion/);
});
