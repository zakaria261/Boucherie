import { test, expect, devices, type APIRequestContext, type Page } from "@playwright/test";

// Panier et liste de courses réunis en une seule demande ; barre d'action mobile.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}

async function fillList(page: Page, phone: string) {
  await page.getByLabel("Prénom").fill("Nadia");
  await page.getByLabel("Nom", { exact: true }).fill("Haddad");
  await page.getByLabel("Téléphone").fill(phone);
  await page.getByLabel("Article 1", { exact: true }).fill("Os à moelle");
  await page.getByLabel("Quantité de l’article 1").fill("4");
  await page.getByRole("radiogroup", { name: "Unité de l’article 1" }).getByRole("radio", { name: "pièces" }).click();
  await page.locator(".day-picker button").first().click();
  const slot = page.locator(".slot-grid button:not([disabled])").first();
  if (await slot.count()) await slot.click();
}

test("liste et panier envoyés ensemble : une seule demande, panier vidé", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/boutique");
  await page.locator(".product", { hasText: "Merguez maison" }).getByRole("button").click();
  // Depuis le panier : proposition d'ajouter une liste de courses.
  await page.getByRole("button", { name: /Voir mon panier/ }).click();
  await page.getByRole("link", { name: /Un produit absent de la boutique/ }).click();
  await expect(page).toHaveURL("/liste-de-courses");
  const join = page.locator(".cart-join");
  await expect(join).toContainText("Joindre mon panier à cette liste");
  await expect(join.getByRole("checkbox")).toBeChecked();
  await fillList(page, "06 44 55 66 77");
  await page.getByRole("button", { name: /Vérifier ma liste/ }).click();
  await expect(page.locator(".paper-cart")).toContainText("Merguez maison");
  await page.getByRole("button", { name: /Envoyer ma demande/ }).click();
  await expect(page).toHaveURL(/\/commande\/suivi\/[a-f0-9]{48}\?confirmation=1/, { timeout: 30000 });
  const ref = ((await page.locator(".confirm-banner").textContent()) || "").match(/LC-[A-F0-9]{8}/)![0];
  await expect(page.getByText("Merguez maison", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Os à moelle", { exact: false }).first()).toBeVisible();
  // Le panier est vide : la barre panier a disparu.
  await page.goto("/");
  await expect(page.locator(".cart-bar")).toHaveCount(0);

  await owner(request);
  const order = (await (await request.get("/api/admin/orders")).json()).orders.find((o: { id: string }) => o.id === ref);
  expect(order).toMatchObject({ origin: "liste", status: "Demande reçue", total: null });
  expect(order.items.map((i: { name: string; kind?: string }) => [i.name, i.kind === "libre"])).toEqual([
    ["Merguez maison", false],
    ["Os à moelle", true],
  ]);
  expect(order.items[0].total).toBeGreaterThan(0);
  await ctx.close();
});

test("le client peut garder son panier à part", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/boutique");
  await page.locator(".product", { hasText: "Merguez maison" }).getByRole("button").click();
  await page.goto("/liste-de-courses");
  await page.locator(".cart-join").click();
  await expect(page.locator(".cart-join").getByRole("checkbox")).not.toBeChecked();
  await fillList(page, "06 44 55 66 78");
  await page.getByRole("button", { name: /Vérifier ma liste/ }).click();
  await expect(page.locator(".paper-cart")).toHaveCount(0);
  await page.getByRole("button", { name: /Envoyer ma demande/ }).click();
  await expect(page).toHaveURL(/\/commande\/suivi\//, { timeout: 30000 });
  await page.goto("/");
  await expect(page.locator(".cart-bar")).toBeVisible();
  await ctx.close();
});

test("téléphone : barre « Commander » au défilement, absente des formulaires", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/");
  const dock = page.getByRole("navigation", { name: "Commander" });
  await expect(dock).not.toHaveClass(/show/);
  await page.evaluate(() => scrollTo(0, 900));
  await expect(dock).toHaveClass(/show/);
  await expect(dock.getByRole("link", { name: /Commander/ })).toHaveAttribute("href", "/boutique");
  await expect(dock.getByRole("link", { name: /Ma liste/ })).toHaveAttribute("href", "/liste-de-courses");
  await expect(dock.getByRole("link", { name: /Appeler/ })).toHaveAttribute("href", /^tel:/);
  await dock.getByRole("link", { name: /Ma liste/ }).click();
  await expect(page).toHaveURL("/liste-de-courses");
  await expect(page.getByRole("navigation", { name: "Commander" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  await ctx.close();
});
