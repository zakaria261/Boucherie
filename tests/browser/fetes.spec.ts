import { test, expect, devices, type APIRequestContext } from "@playwright/test";

// Catalogue des fêtes : contenu fidèle au livret, ajout à la liste sans envoi,
// édition et masquage depuis l'application.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}

test("catalogue des fêtes : rubriques, fiches fidèles, aucun prix ni texte d’exemple", async ({ page }) => {
  await page.goto("/catalogue-des-fetes");
  await expect(page.getByRole("heading", { level: 1, name: "Catalogue des fêtes" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Rubriques du catalogue" });
  await expect(nav.getByRole("link")).toHaveCount(11);
  const chapon = page.getByRole("article", { name: "Chapon fermier" });
  await expect(chapon).toContainText("Pour 6 à 8 personnes");
  await expect(chapon).toContainText("2 h 30 de cuisson à 180 °C.");
  await expect(page.getByRole("article", { name: "Terrine de saumon" })).toContainText("Marque : Cran d’Escalles");
  await expect(page.getByRole("article", { name: "Foie gras de canard extra déveiné" })).toContainText("Vestey Foods");
  // Agneau : textes du livret recopiés du bœuf, non repris.
  await expect(page.getByRole("article", { name: "Gigot d’agneau" })).not.toContainText("tournedos");
  const body = (await page.locator(".page").first().textContent()) || "";
  expect(body).not.toMatch(/€|\$|PRICE|LICERIA|reallygreatsite/i);
  await nav.getByRole("link", { name: "Agneau d’excellence" }).click();
  await expect(page).toHaveURL(/#agneau$/);
});

test("ajout de produits à la liste de courses, sans envoi de commande", async ({ browser, request }) => {
  await owner(request);
  const before = (await (await request.get("/api/admin/orders")).json()).orders.length;
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/catalogue-des-fetes");
  await page.getByRole("button", { name: "Ajouter Chapon fermier à ma liste" }).tap();
  // Produits homonymes distingués par leur unité.
  await page.getByRole("button", { name: "Ajouter Bloc de foie gras de canard (250 g) à ma liste" }).tap();
  await page.getByRole("button", { name: "Ajouter Dinde fermière à ma liste" }).tap();
  await page.getByRole("button", { name: "Dinde fermière : dans ma liste, retirer" }).tap();
  await expect(page.locator(".festive-bar")).toContainText("2 produits dans ma liste");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("link", { name: "Finaliser ma liste" }).tap();
  await expect(page).toHaveURL("/liste-de-courses");
  await expect(page.getByText("« Chapon fermier », « Bloc de foie gras de canard (250 g) » ont été ajoutés", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Article 1", { exact: true })).toHaveValue("Chapon fermier");
  await expect(page.getByLabel("Article 2", { exact: true })).toHaveValue("Bloc de foie gras de canard (250 g)");
  // Les ajouts sont mémorisés au retour sur le catalogue.
  await page.goto("/catalogue-des-fetes");
  await expect(page.getByRole("button", { name: "Chapon fermier : dans ma liste, retirer" })).toHaveAttribute("aria-pressed", "true");
  expect((await (await request.get("/api/admin/orders")).json()).orders.length).toBe(before);
  await ctx.close();
});

test("le boucher complète une fiche, masque le catalogue, puis le rétablit", async ({ page, request }) => {
  await owner(request);
  const { defaultFestive } = await import("../../lib/fetes.ts");
  const edited = structuredClone(defaultFestive);
  const agneau = edited.sections.find((s) => s.id === "agneau")!;
  agneau.items[0] = { ...agneau.items[0], description: "Notre gigot, préparé à la demande.", cooking: "1 h à 180 °C." };
  expect((await request.put("/api/admin/fetes", { headers, data: { ...edited, sections: [] } })).status()).toBe(400);
  expect((await request.put("/api/admin/fetes", { headers, data: edited })).status()).toBe(200);
  await page.goto("/catalogue-des-fetes");
  await expect(page.getByRole("article", { name: "Gigot d’agneau" })).toContainText("Notre gigot, préparé à la demande.");

  expect((await request.put("/api/admin/fetes", { headers, data: { ...edited, visible: false } })).status()).toBe(200);
  await page.goto("/catalogue-des-fetes");
  await expect(page.getByText("Notre catalogue des fêtes revient bientôt.")).toBeVisible();
  await expect(page.locator(".festive-card")).toHaveCount(0);

  expect((await request.put("/api/admin/fetes", { headers, data: defaultFestive })).status()).toBe(200);
  await page.context().clearCookies();
  expect((await page.context().request.put("/api/admin/fetes", { headers, data: defaultFestive })).status()).toBe(401);
});
