import { test, expect, devices } from "@playwright/test";

// En-tête façon boutique en ligne : bandeau, état d'ouverture, logo centré,
// rayons sur une ligne ; menu complet en tiroir.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;

test("en-tête : rayons sur une ligne, état d’ouverture, menu en tiroir", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Annonces de la boutique" })).toContainText("Commandez la veille");
  // Ouvert ou fermé : calculé dans le navigateur, jamais laissé vide.
  await expect(page.locator(".header-status")).toContainText(/^(Ouvert · jusqu’à|Fermé)/);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const links = nav.getByRole("link");
  await expect(links.first()).toHaveText("La boutique");
  await expect(nav.getByRole("link", { name: "Promotions" })).toHaveClass(/aisle-hot/);
  // Tous les rayons tiennent sur une seule ligne, sans débordement.
  const tops = new Set<number>();
  for (const l of await links.all()) tops.add(Math.round((await l.boundingBox())!.y));
  expect(tops.size).toBe(1);
  expect(await nav.locator(".aisle-track").evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  // Un rayon de la boutique ouvre la boutique filtrée.
  await nav.getByRole("link", { name: "Volailles" }).click();
  await expect(page).toHaveURL("/boutique?categorie=Volailles");
  await expect(page.locator(".product")).toHaveCount(20);
  // Le menu complet (conseils, la boucherie) s'ouvre en tiroir sur grand écran.
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByRole("link", { name: "Guide des morceaux" })).toBeVisible();
  expect((await page.locator("dialog.menu-sheet").boundingBox())!.width).toBeLessThanOrEqual(420);
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
