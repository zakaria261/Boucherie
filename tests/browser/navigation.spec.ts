import { test, expect, devices } from "@playwright/test";

// Navigation resserrée : quatre entrées, panneaux, menu mobile regroupé.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;

test("en-tête : quatre entrées, panneaux qui s’ouvrent et se referment", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.locator(".nav-top")).toHaveText(["La boutique", "Promotions", "Conseils", "La boucherie"]);
  // Aucune entrée ne passe sur deux lignes.
  for (const top of await nav.locator(".nav-top").all()) expect((await top.boundingBox())!.height).toBeLessThanOrEqual(46);

  // Survol : le panneau s'ouvre ; un clic mène à la page et referme le panneau.
  await nav.getByRole("button", { name: "Conseils" }).hover();
  const guide = nav.getByRole("link", { name: /Guide des morceaux/ });
  await expect(guide).toBeVisible();
  await guide.click();
  await expect(page).toHaveURL(/\/morceaux/);
  await expect(guide).toBeHidden();
  await expect(nav.getByRole("button", { name: "Conseils" })).toHaveAttribute("aria-current", "page");

  // Au clavier ou au toucher : bouton qui ouvre et ferme (Échap).
  const maison = nav.getByRole("button", { name: "La boucherie" });
  await maison.click();
  await expect(maison).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: /Professionnels/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(maison).toHaveAttribute("aria-expanded", "false");
});

test("menu mobile : actions principales puis rubriques regroupées", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByRole("link", { name: "Commander" })).toBeVisible();
  await expect(menu.locator(".menu-group h2")).toHaveText(["La boutique", "Conseils", "La boucherie"]);
  await menu.getByRole("link", { name: "Lots et marinades" }).click();
  await expect(page).toHaveURL("/lots-et-marinades");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  await ctx.close();
});

test("application du boucher : pas de zoom, site ouvert hors de l’app", async ({ page }) => {
  await page.goto("/admin/connexion");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /maximum-scale=1.*user-scalable=no/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe("manipulation");
});
