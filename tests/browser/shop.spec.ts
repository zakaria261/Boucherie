import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = {
  email: "proprietaire@example.com",
  password: "Une-boucherie-2026-solide!",
};
const sample = {
  name: "Pièce du test artisan",
  price: 2299,
  category: "Bœuf",
  image: "/images/hero.jpg",
  description: "Une pièce pour vérifier le catalogue.",
  ingredients: "Demandez conseil à votre artisan.",
  badge: "Sélection test",
  published: false,
  available: true,
  featured: false,
  grill: true,
};
async function login(page: Page) {
  await page.goto("/admin/connexion");
  await page.getByLabel("Votre e-mail").fill(auth.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(auth.password);
  await page.getByRole("button", { name: "Entrer dans ma boutique" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function loginApi(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: auth,
  });
  expect(response.ok()).toBeTruthy();
}
test.beforeAll(async ({ request }) => {
  const setup = await request.post("/api/auth/setup", {
    headers: { Origin: origin },
    data: { ...auth, token: "test-installation-token-only" },
  });
  if (setup.status() !== 200) {
    expect(setup.status()).toBe(403);
    await loginApi(request);
  }
});

test("le vrai logo, les pages distinctes, recherche et filtres", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".header .brand img")).toHaveAttribute(
    "src",
    "/images/logo-original.png",
  );
  await expect(page.locator(".header .brand img")).toHaveJSProperty(
    "naturalWidth",
    225,
  );
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "La boutique", exact: true })
    .click();
  await expect(page).toHaveURL("/boutique");
  await expect(page.locator(".product")).toHaveCount(58);
  await page.getByRole("button", { name: "Volailles", exact: false }).click();
  await expect(page.locator(".product")).toHaveCount(20);
  await page.getByLabel("Rechercher dans la boutique").fill("curry");
  await expect(page.locator(".product")).toHaveCount(2);
  await page.getByLabel("Rechercher dans la boutique").fill("introuvable");
  await expect(page.getByText("Aucun produit pour cette envie.")).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(page.locator(".product")).toHaveCount(58);
  for (const [name, url] of [
    ["Notre maison", "/notre-maison"],
    ["Contact", "/contact"],
    ["Barbecue", "/barbecue"],
  ]) {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(url);
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("accès propriétaire fermé, CSRF et validation côté serveur", async ({
  request,
  page,
}) => {
  await page.goto("/admin/produits");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  expect(
    (
      await request.post("/api/admin/produits", {
        headers: { Origin: origin },
        data: sample,
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { Origin: "https://autre-site.example" },
        data: auth,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/setup", {
        headers: { Origin: origin },
        data: { ...auth, token: "test-installation-token-only" },
      })
    ).status(),
  ).toBe(403);
  await loginApi(request);
  expect(
    (
      await request.post("/api/admin/produits", {
        headers: { Origin: origin },
        data: { ...sample, price: -100 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/admin/produits", {
        headers: { Origin: origin },
        data: { ...sample, image: "javascript:alert(1)" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/admin/upload", {
        headers: { Origin: origin, "Content-Type": "image/png" },
        data: Buffer.from('<svg onload="alert(1)"></svg>'),
      })
    ).status(),
  ).toBe(400);
});
test("le propriétaire crée, photographie, publie, modifie et supprime un produit", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("link", { name: "Ajouter un produit", exact: true })
    .click();
  await page.getByLabel("Nom du produit", { exact: true }).fill(sample.name);
  await page.getByLabel("Prix au kilogramme (€)").fill("22.99");
  await page
    .getByLabel("Description", { exact: true })
    .fill(sample.description);
  await page
    .getByLabel("Photo du produit", { exact: true })
    .setInputFiles("public/images/merguez-maison.jpg");
  await expect(
    page.getByRole("button", { name: "Changer la photo" }),
  ).toBeVisible();
  await page.getByLabel("Publier le produit", { exact: false }).check();
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page).toHaveURL(/\/admin\/produits\/piece-du-test/);
  const id = decodeURIComponent(page.url().split("/").pop()!);
  await page.goto(`/boutique/${encodeURIComponent(id)}`);
  await expect(page.locator("h1")).toHaveText(sample.name);
  await expect(page.locator(".product-detail-price")).toContainText("22,99");
  const image = await page
    .locator(".product-detail-photo img")
    .getAttribute("src");
  expect(image).toMatch(/^\/media\//);
  await expect
    .poll(() =>
      page
        .locator(".product-detail-photo img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.goto(`/admin/produits/${encodeURIComponent(id)}`);
  await page.getByLabel("Prix au kilogramme (€)").fill("24.50");
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByRole("status")).toContainText("Produit enregistré");
  await page.reload();
  await expect(page.getByLabel("Prix au kilogramme (€)")).toHaveValue("24.50");
  await page.goto(`/boutique/${encodeURIComponent(id)}`);
  await expect(page.locator(".product-detail-price")).toContainText("24,50");
  await page.goto(`/admin/produits/${encodeURIComponent(id)}`);
  await page.getByLabel("Disponible à la commande", { exact: false }).uncheck();
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByRole("status")).toContainText("Produit enregistré");
  await page.goto(`/boutique/${encodeURIComponent(id)}`);
  await expect(page.getByRole("button", { name: /Ajouter ·/ })).toBeDisabled();
  await page.goto(`/admin/produits/${encodeURIComponent(id)}`);
  await page.getByLabel("Publier le produit", { exact: false }).uncheck();
  await page.getByRole("button", { name: "Enregistrer le produit" }).click();
  await expect(page.getByRole("status")).toContainText("Produit enregistré");
  expect(
    (await page.request.get(`/boutique/${encodeURIComponent(id)}`)).status(),
  ).toBe(404);
  await page.getByRole("button", { name: "Supprimer ce produit" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page).toHaveURL("/admin/produits");
  await page.getByLabel("Rechercher un produit").fill(sample.name);
  await expect(page.getByText("Aucun produit trouvé.")).toBeVisible();
});
test("conflit de modification et prix non falsifiable", async ({ request }) => {
  await loginApi(request);
  const created = await request.post("/api/admin/produits", {
    headers: { Origin: origin },
    data: { ...sample, published: true },
  });
  const { product } = await created.json();
  const first = await request.put(`/api/admin/produits/${product.id}`, {
    headers: { Origin: origin },
    data: { ...product, price: 2500 },
  });
  expect(first.status()).toBe(200);
  const stale = await request.put(`/api/admin/produits/${product.id}`, {
    headers: { Origin: origin },
    data: { ...product, price: 1500 },
  });
  expect(stale.status()).toBe(409);
  const date = new Date();
  date.setDate(date.getDate() + 2);
  const dateString = date.toISOString().slice(0, 10);
  const order = {
    requestKey: crypto.randomUUID(),
    name: "Client test",
    email: "client@example.com",
    phone: "0612345678",
    whatsappOptIn: false,
    date: dateString,
    items: [{ id: product.id, grams: 500, quantity: 1, price: 1 }],
  };
  expect(
    (
      await request.post("/api/orders", {
        headers: { Origin: origin },
        data: order,
      })
    ).status(),
  ).toBe(409);
  const valid = { ...order, items: [{ ...order.items[0], price: 2500 }] };
  const one = await request.post("/api/orders", {
    headers: { Origin: origin },
    data: valid,
  });
  expect(one.status()).toBe(201);
  const two = await request.post("/api/orders", {
    headers: { Origin: origin },
    data: valid,
  });
  expect((await one.json()).id).toBe((await two.json()).id);
  expect(
    (
      await request.post("/api/orders", {
        headers: { Origin: origin },
        data: { ...valid, requestKey: crypto.randomUUID(), date: "2020-01-01" },
      })
    ).status(),
  ).toBe(400);
  await request.delete(`/api/admin/produits/${product.id}`, {
    headers: { Origin: origin },
    data: { version: 2 },
  });
});
test("le Click & Collect ouvre WhatsApp avec la commande complète", async ({
  page,
}) => {
  await page.goto("/boutique/c%C3%B4te-%C3%A0-l-os-matur%C3%A9");
  await page.getByRole("button", { name: "1 kg", exact: true }).click();
  await page.getByRole("button", { name: /Ajouter ·/ }).click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Notre maison" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Mon panier" }).click();
  await expect(
    page.locator(".cart-summary").getByText("34,99", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Augmenter Côte à l'os maturé" })
    .click();
  await expect(
    page.locator(".cart-summary").getByText("69,98", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Commander sur WhatsApp" }).click();
  await login(page);
  await page.getByRole("link", { name: "Ma boutique", exact: true }).click();
  await page
    .getByLabel("Numéro WhatsApp de la boucherie")
    .fill("06 12 34 56 78");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(page.getByRole("status")).toContainText("enregistrées");
  await page.goto("/commande");
  await page.getByLabel("Nom complet").fill("Client du parcours");
  await page.getByLabel("Téléphone").fill("0612345678");
  const date = new Date();
  date.setDate(date.getDate() + 2);
  await page.getByLabel("Date souhaitée").fill(date.toISOString().slice(0, 10));
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>WhatsApp</title>",
    }),
  );
  await page.getByRole("button", { name: "Commander sur WhatsApp" }).click();
  await expect(page).toHaveURL(/https:\/\/wa\.me\/33612345678/);
  const message = decodeURIComponent(
    new URL(page.url()).searchParams.get("text") || "",
  );
  expect(message).toContain("Client du parcours");
  expect(message).toContain("Côte à l'os maturé");
  expect(message).toMatch(/69,98\s?€/);
});
test("réglages de la boutique conservés et logo modifiable", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Ma boutique", exact: true }).click();
  await page
    .getByLabel("Message du bandeau supérieur")
    .fill("Votre artisan vous accueille à Amiens");
  await page.getByLabel("Téléphone", { exact: true }).fill("03 00 00 00 00");
  await page
    .getByLabel("Numéro WhatsApp de la boucherie")
    .fill("06 12 34 56 78");
  await page
    .getByLabel("Horaires et informations de retrait")
    .fill("Horaires de test");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(page.getByRole("status")).toContainText("enregistrées");
  await page.reload();
  await expect(page.getByLabel("Téléphone", { exact: true })).toHaveValue(
    "03 00 00 00 00",
  );
  await expect(page.getByLabel("Numéro WhatsApp de la boucherie")).toHaveValue(
    "06 12 34 56 78",
  );
  await page.goto("/contact");
  await expect(page.locator(".announcement")).toContainText(
    "Votre artisan vous accueille à Amiens",
  );
  await expect(page.getByText("Horaires de test")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Écrire sur WhatsApp" }),
  ).toHaveAttribute("href", /wa\.me\/33612345678/);
});
test("contrôle visuel ordinateur et mobile, sans débordement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await page.screenshot({ path: "/tmp/faubourg-v2-home.png", fullPage: true });
  await page.goto("/boutique");
  await page.screenshot({
    path: "/tmp/faubourg-v2-boutique.png",
    fullPage: false,
  });
  await login(page);
  await page.screenshot({ path: "/tmp/faubourg-v2-admin.png", fullPage: true });
  await page.goto("/admin/produits");
  await page.screenshot({
    path: "/tmp/faubourg-v2-products.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [
    "/",
    "/boutique",
    "/barbecue",
    "/notre-maison",
    "/contact",
    "/admin",
    "/admin/produits",
    "/admin/boutique",
  ]) {
    await page.goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      url,
    ).toBe(true);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "La boutique", exact: true })
    .click();
  await expect(page).toHaveURL("/boutique");
  await expect(page.locator(".nav")).not.toBeVisible();
  await page.screenshot({
    path: "/tmp/faubourg-v2-mobile.png",
    fullPage: false,
  });
  await page.goto("/admin");
  await page.screenshot({
    path: "/tmp/faubourg-v2-admin-mobile.png",
    fullPage: true,
  });
});
test("déconnexion et changement de mot de passe invalident les sessions", async ({
  page,
  request,
}) => {
  await login(page);
  await loginApi(request);
  await page.goto("/admin/boutique");
  await page.getByLabel("Mot de passe actuel").fill(auth.password);
  await page
    .getByLabel("Nouveau mot de passe")
    .fill("Nouveau-mot-de-passe-2026!");
  await page.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Mot de passe mis à jour",
  );
  expect(
    (
      await request.post("/api/admin/produits", {
        headers: { Origin: origin },
        data: sample,
      })
    ).status(),
  ).toBe(401);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/admin/connexion");
  await page.goto("/admin/commandes");
  await expect(page).toHaveURL("/admin/connexion");
});
