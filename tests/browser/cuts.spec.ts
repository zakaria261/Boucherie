import { test, expect, devices, type APIRequestContext } from "@playwright/test";

// Guide des morceaux : carte interactive, fiches, vitrine, liste de courses.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}

test("guide : survol en aperçu, sélection stable, clavier, liste et changement d’espèce", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/morceaux");
  await expect(page.getByRole("heading", { name: "À chaque morceau, son plaisir" })).toBeVisible();
  await expect(page.getByText("Découvrez les morceaux de bœuf, d’agneau et de veau", { exact: false })).toBeVisible();
  await expect(page.locator(".cut-empty")).toHaveText("Sélectionnez un morceau pour découvrir nos conseils.");
  const tabs = page.getByRole("tablist", { name: "Animal" });
  await expect(tabs.getByRole("tab")).toHaveText(["Bœuf", "Agneau", "Veau"]);

  // Survol : aperçu de la fiche, sans rien choisir.
  await page.locator('.cut-zone[aria-label="Faux-filet"]').hover();
  await expect(page.getByRole("article", { name: "Faux-filet, Bœuf" })).toBeVisible();
  await expect(page.locator(".cut-sheet .eyebrow")).toHaveText("Bœuf · aperçu");
  // Clic : la fiche reste affichée, même si la souris passe sur une autre zone.
  await page.getByRole("button", { name: "Paleron", exact: true }).first().click();
  await page.locator('.cut-zone[aria-label="Rumsteck"]').hover();
  await expect(page.locator(".cut-caption")).toContainText("Rumsteck");
  await expect(page.getByRole("heading", { level: 2, name: "Paleron" })).toBeVisible();
  await expect(page.locator('.cut-zone[aria-label="Paleron, sélectionné"]')).toHaveAttribute("aria-pressed", "true");
  // Clavier : focus visible et Entrée.
  await page.locator('.cut-zone[aria-label="Collier"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "Collier" })).toBeVisible();
  // Liste synchronisée avec la carte.
  await page.getByRole("group", { name: "Liste des morceaux du bœuf" }).getByRole("button", { name: "Onglet" }).click();
  await expect(page.locator('.cut-zone[aria-label="Onglet, sélectionné"]')).toBeVisible();
  await expect(page).toHaveURL(/\?espece=boeuf&morceau=onglet$/);

  // Espèce : carte, liste et fiches changent sans rechargement.
  await page.evaluate(() => ((window as unknown as { marker: boolean }).marker = true));
  await tabs.getByRole("tab", { name: "Agneau" }).click();
  await expect(page.getByRole("group", { name: "Liste des morceaux de l’agneau" }).getByRole("button", { name: "Gigot" })).toBeVisible();
  await expect(page.locator('.cut-zone[aria-label="Paleron"]')).toHaveCount(0);
  await expect(page.locator(".cut-empty")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(true);
  expect(errors).toEqual([]);
});

test("chaque zone ouvre sa propre fiche, pour les trois espèces", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/morceaux");
  const counts: Record<string, number> = {};
  for (const animal of ["Bœuf", "Agneau", "Veau"]) {
    await page.getByRole("tab", { name: animal }).click();
    const zones = page.locator(".cut-zone");
    const n = await zones.count();
    counts[animal] = n;
    const names = new Set<string>();
    for (let i = 0; i < n; i++) {
      const zone = zones.nth(i);
      const label = (await zone.getAttribute("aria-label"))!.replace(", sélectionné", "");
      await zone.dispatchEvent("click");
      await expect(page.getByRole("article", { name: `${label}, ${animal}` })).toBeVisible();
      await expect(page.locator(".cut-cooking li").first()).toBeVisible();
      await expect(page.locator(".cut-tip")).toContainText("Le conseil du boucher");
      names.add(label);
    }
    expect(names.size).toBe(n);
  }
  expect(counts).toEqual({ Bœuf: 29, Agneau: 10, Veau: 14 });
  // Les vraies zones réagissent au clic à la souris (pas seulement par programme).
  await page.getByRole("tab", { name: "Veau" }).click();
  await page.locator('.cut-zone[aria-label="Quasi"]').click();
  await expect(page.getByRole("heading", { level: 2, name: "Quasi" })).toBeVisible();
});

test("vitrine, morceau absent et liste de courses préremplie sans envoi", async ({ page, request }) => {
  await owner(request);
  const before = (await (await request.get("/api/admin/orders")).json()).orders.length;
  // Article déjà saisi dans la liste : il doit être conservé.
  await page.goto("/liste-de-courses");
  await page.getByLabel("Article 1", { exact: true }).fill("Saucisses de Toulouse");
  await page.goto("/morceaux?espece=boeuf&morceau=paleron");
  const vitrine = page.locator(".cut-products");
  await expect(vitrine.getByRole("heading", { name: "Retrouvez ce morceau dans notre vitrine" })).toBeVisible();
  await expect(vitrine.locator(".product")).toHaveCount(1);
  await expect(vitrine.locator(".product-name")).toHaveText("Paleron");
  await page.getByRole("group", { name: "Liste des morceaux du bœuf" }).getByRole("button", { name: "Onglet" }).click();
  await expect(vitrine.locator(".product")).toHaveCount(0);
  await expect(page.getByText("Vous ne trouvez pas ce morceau dans notre vitrine en ligne ?")).toBeVisible();
  await expect(page.getByText("Notre sélection évolue chaque jour. Ajoutez-le à votre liste de courses", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Demander ce morceau" }).click();
  await expect(page).toHaveURL("/liste-de-courses", { timeout: 30000 });
  await expect(page.getByText("« Onglet (bœuf) » a été ajouté à votre liste.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Article 1", { exact: true })).toHaveValue("Saucisses de Toulouse");
  await expect(page.getByLabel("Article 2", { exact: true })).toHaveValue("Onglet (bœuf)");
  await expect(page.getByLabel("Quantité de l’article 2")).toHaveValue("");
  // Aucune commande n'est envoyée sans validation du client.
  expect((await (await request.get("/api/admin/orders")).json()).orders.length).toBe(before);
});

test("mobile : carte sans débordement, sélection au toucher par la liste", async ({ browser }) => {
  for (const device of [devices["iPhone SE"], devices["Pixel 7"]]) {
    const ctx = await browser.newContext({ ...device, baseURL: origin });
    const page = await ctx.newPage();
    await page.goto("/morceaux?espece=veau");
    await expect(page.getByRole("tab", { name: "Veau" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("group", { name: "Liste des morceaux du veau" }).getByRole("button", { name: "Jarret" }).tap();
    await expect(page.getByRole("heading", { level: 2, name: "Jarret" })).toBeVisible();
    await page.locator('.cut-zone[aria-label="Collier"]').tap();
    await expect(page.getByRole("heading", { level: 2, name: "Collier" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await ctx.close();
  }
});

test("le boucher modifie une fiche depuis l’app, puis rétablit l’originale", async ({ page, request }) => {
  await owner(request);
  const key = encodeURIComponent("agneau:selle");
  const base = {
    name: "Selle",
    summary: "Une selle d’agneau préparée chaque semaine par notre équipe, à commander la veille.",
    texture: "Très tendre.",
    flavor: "Fine.",
    bone: "Avec os.",
    cooking: ["Rôtie au four à 200 °C, 20 à 25 min pour une selle d’environ 1 kg."],
    tip: "Demandez-la roulée la veille.",
    dish: "Selle rôtie aux herbes.",
    image: "",
    productIds: [] as string[],
  };
  // Un produit d'une autre espèce est refusé.
  expect((await request.put(`/api/admin/morceaux/${key}`, { headers, data: { ...base, productIds: ["paleron"] } })).status()).toBe(400);
  expect((await request.put(`/api/admin/morceaux/${key}`, { headers, data: { ...base, productIds: ["gigot"] } })).status()).toBe(200);
  expect((await request.put(`/api/admin/morceaux/${encodeURIComponent("agneau:inconnu")}`, { headers, data: base })).status()).toBe(404);
  await page.goto("/morceaux?espece=agneau&morceau=selle");
  await expect(page.getByText("préparée chaque semaine par notre équipe", { exact: false })).toBeVisible();
  await expect(page.locator(".cut-products .product-name")).toHaveText("Gigot");
  expect((await request.delete(`/api/admin/morceaux/${key}`, { headers })).status()).toBe(200);
  await page.goto("/morceaux?espece=agneau&morceau=selle");
  await expect(page.getByText("La selle réunit les deux côtés de la longe", { exact: false })).toBeVisible();
  // Accès refusé sans connexion.
  const anonymous = await page.context().request;
  await page.context().clearCookies();
  expect((await anonymous.put(`/api/admin/morceaux/${key}`, { headers, data: base })).status()).toBe(401);
});
