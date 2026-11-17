import { test, expect, devices, type APIRequestContext } from "@playwright/test";

// Lots et marinades : présentation, commande d'un lot, règles du week-end.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

test("page lots et marinades : contenu, prix, marinades sans données inventées", async ({ page }) => {
  await page.goto("/lots-et-marinades");
  await expect(page.getByRole("heading", { level: 1, name: "Nos lots et nos marinades" })).toBeVisible();
  await expect(page.getByText("Commandez la veille pour le lendemain", { exact: false }).first()).toBeVisible();
  const lot1 = page.getByRole("article", { name: "Lot n° 1" });
  await expect(lot1).toContainText("1 kg de viande hachée");
  await expect(lot1).toContainText("35,00 €");
  await expect(page.locator(".lot-card")).toHaveCount(11);
  await expect(page.getByRole("article", { name: "Lot poulet rôti" })).toContainText("Uniquement le week-end.");
  await expect(page.locator(".marinade-card")).toHaveCount(17);
  const tandoori = page.locator(".marinade-card", { has: page.getByRole("heading", { name: "Tandoori", exact: true }) });
  await expect(tandoori).toContainText("yaourt et épices");
  await expect(tandoori).toContainText("Liste disponible en boutique");
  // Accès depuis la page Informations et le menu.
  await page.goto("/informations");
  await page.getByRole("link", { name: "Voir les lots et marinades" }).click();
  await expect(page).toHaveURL("/lots-et-marinades");
});

test("commande d’un lot : volet, prix serveur, réception dans l’application", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/lots-et-marinades");
  await page.getByRole("article", { name: "Lot BBQ", exact: true }).getByRole("button", { name: "Commander ce lot" }).click();
  const dialog = page.getByRole("dialog", { name: "Lot BBQ", exact: true });
  await dialog.getByRole("button", { name: "Un lot de plus" }).click();
  await expect(dialog.locator(".lot-qty strong")).toHaveText("130,00 €");
  await dialog.getByLabel("Marinade souhaitée pour les produits marinés").selectOption({ label: "Tex Mex" });
  await dialog.getByLabel("Prénom").fill("Inès");
  await dialog.getByLabel("Nom", { exact: true }).fill("Morel");
  await dialog.getByLabel("Téléphone").fill("06 22 33 44 55");
  await dialog.locator(".day-picker button").first().click();
  await dialog.locator(".slot-grid button:not([disabled])").first().click();
  await dialog.getByRole("button", { name: /Envoyer ma commande/ }).click();
  await expect(page).toHaveURL(/\/commande\/suivi\/[a-f0-9]{48}\?confirmation=1/, { timeout: 30000 });
  await expect(page.getByText("Commande enregistrée")).toBeVisible();
  await expect(page.locator(".cart-total strong")).toHaveText("130,00 €");
  const ref = (await page.locator(".confirm-banner b").textContent())!;
  expect(ref).toMatch(/^LT-/);

  await owner(request);
  const { orders } = await (await request.get("/api/admin/orders")).json();
  const order = orders.find((o: { id: string }) => o.id === ref);
  expect(order).toMatchObject({ origin: "lot", status: "Demande reçue", total: 13000 });
  expect(order.items[0]).toMatchObject({ name: "Lot BBQ", quantity: 2, price: 6500, total: 13000 });
  expect(order.items[0].note).toContain("Marinade : Tex Mex");
  await ctx.close();
});

test("lot du week-end, lot inconnu, prix et origine non modifiables par le navigateur", async ({ page, request }) => {
  await page.goto("/lots-et-marinades");
  await page.getByRole("article", { name: "Lot poulet rôti" }).getByRole("button", { name: "Commander ce lot" }).click();
  const days = page.getByRole("dialog", { name: "Lot poulet rôti" }).locator(".day-picker button");
  await expect(days.first()).toBeVisible();
  for (const label of await days.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") || "")))
    expect(label).toMatch(/^(samedi|dimanche)/);

  const { dates } = await (await request.get("/api/creneaux")).json();
  const week = dates.find((d: { date: string }) => ![0, 6].includes(weekday(d.date)));
  const base = {
    requestKey: crypto.randomUUID(),
    lotId: "lot-poulet-roti",
    quantity: 1,
    firstName: "Test",
    lastName: "Semaine",
    phone: "06 10 10 10 10",
    email: "",
    date: week.date,
    time: week.slots[0].time,
    price: 1,
  };
  const refused = await request.post("/api/lot", { headers, data: base });
  expect(refused.status()).toBe(400);
  expect((await refused.json()).error).toMatch(/certains jours/);
  expect((await request.post("/api/lot", { headers, data: { ...base, requestKey: crypto.randomUUID(), lotId: "lot-inexistant" } })).status()).toBe(409);
  expect((await request.post("/api/lot", { headers, data: { ...base, requestKey: crypto.randomUUID(), lotId: "lot-1", quantity: 0 } })).status()).toBe(400);
  // Origine d'un site tiers : refusée (protection CSRF).
  expect((await request.post("/api/lot", { headers: { Origin: "https://site-tiers.example" }, data: { ...base, lotId: "lot-1" } })).status()).toBe(403);
});

test("le boucher modifie les lots et complète une marinade depuis l’app", async ({ page, request }) => {
  await owner(request);
  expect(await (await request.get("/lots-et-marinades")).text()).toContain("Lot éco");
  const lots = [
    { id: "lot-eco", name: "Lot éco", items: ["500 g de filet de poulet", "500 g de viande hachée"], price: 2100, note: "", days: [], marinade: false, visible: true },
  ];
  const marinades = [
    { id: "tandoori", name: "Tandoori", description: "Une marinade généreuse mêlant yaourt et épices.", ingredients: "Yaourt, épices tandoori, huile.", allergens: "Lait", visible: true },
  ];
  expect((await request.put("/api/admin/offres", { headers, data: { lots: [{ ...lots[0], price: 0 }], marinades } })).status()).toBe(400);
  expect((await request.put("/api/admin/offres", { headers, data: { lots, marinades } })).status()).toBe(200);
  await page.goto("/lots-et-marinades");
  await expect(page.locator(".lot-card")).toHaveCount(1);
  await expect(page.getByRole("article", { name: "Lot éco" })).toContainText("21,00 €");
  await expect(page.locator(".marinade-card")).toContainText("Yaourt, épices tandoori, huile.");
  await expect(page.locator(".marinade-card")).toContainText("Lait");
  // Retour aux offres d'origine pour la suite.
  const { defaultOffers } = await import("../../lib/offers.ts");
  expect((await request.put("/api/admin/offres", { headers, data: defaultOffers })).status()).toBe(200);
});
