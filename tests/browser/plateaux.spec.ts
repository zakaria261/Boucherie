import { test, expect, devices, type APIRequestContext } from "@playwright/test";

// Plateaux à partager et livrets à feuilleter.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}

test("plateau : nombre de personnes, version marinée, retrait à partir du lendemain", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/plateaux-a-partager");
  await expect(page.locator(".plateau-card")).toHaveCount(3);
  await expect(page.getByText("Commandez au minimum la veille pour le lendemain", { exact: false })).toBeVisible();
  await page.getByRole("article", { name: "Pierrade et plancha" }).getByRole("button", { name: "Commander ce plateau" }).click();
  const dialog = page.getByRole("dialog", { name: "Pierrade et plancha" });
  await dialog.getByRole("button", { name: "Marinée" }).click();
  await dialog.getByLabel("Marinade souhaitée").selectOption({ label: "Tandoori" });
  for (let i = 0; i < 4; i++) await dialog.getByRole("button", { name: "Une personne de plus" }).click();
  await expect(dialog.locator(".plateau-estimate")).toHaveText("environ 2 kg à 2,5 kg");
  await dialog.getByLabel("Prénom").fill("Sarah");
  await dialog.getByLabel("Nom", { exact: true }).fill("Lemaire");
  await dialog.getByLabel("Téléphone").fill("06 31 41 59 26");
  // Le jour même n'est jamais proposé.
  for (const label of await dialog.locator(".day-picker button").evaluateAll((els) => els.map((e) => e.textContent || "")))
    expect(label).not.toMatch(/Aujourd/);
  await dialog.locator(".day-picker button").first().click();
  await dialog.locator(".slot-grid button:not([disabled])").first().click();
  await dialog.getByRole("button", { name: /Envoyer ma demande/ }).click();
  await expect(page).toHaveURL(/\/commande\/suivi\/[a-f0-9]{48}\?confirmation=1/, { timeout: 30000 });
  const ref = (await page.locator(".confirm-banner b").textContent())!;
  expect(ref).toMatch(/^PT-/);
  await owner(request);
  const order = (await (await request.get("/api/admin/orders")).json()).orders.find((o: { id: string }) => o.id === ref);
  expect(order).toMatchObject({ origin: "plateau", status: "Demande reçue", total: null });
  expect(order.items[0]).toMatchObject({ name: "Pierrade et plancha (marinée)", price: null });
  expect(order.items[0].note).toBe("Pour 10 personnes (environ 2 kg à 2,5 kg) — Marinade : Tandoori");
  await ctx.close();
});

test("plateau : budget, refus du jour même et des valeurs invalides", async ({ request }) => {
  const { dates } = await (await request.get("/api/creneaux")).json();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  // Un créneau encore libre (les autres tests en remplissent certains).
  type Day = { date: string; slots: { time: string; full: boolean }[] };
  const later = (dates as Day[])
    .filter((d) => d.date > today)
    .map((d) => ({ date: d.date, slots: d.slots.filter((x) => !x.full).slice(-1) }))
    .find((d) => d.slots.length)!;
  const base = {
    requestKey: crypto.randomUUID(),
    plateauId: "plateau-charcuterie",
    mode: "budget",
    budget: "90",
    firstName: "Test",
    lastName: "Budget",
    phone: "06 27 18 28 18",
    email: "",
    date: later.date,
    time: later.slots[0].time,
  };
  const created = await request.post("/api/plateau", { headers, data: base });
  expect(created.status()).toBe(201);
  await owner(request);
  const { id } = await created.json();
  const order = (await (await request.get("/api/admin/orders")).json()).orders.find((o: { id: string }) => o.id === id);
  expect(order.items[0]).toMatchObject({ name: "Plateau charcuterie", note: "Budget : 90 €" });

  const sameDay = dates.find((d: { date: string }) => d.date === today);
  if (sameDay) {
    const refused = await request.post("/api/plateau", {
      headers,
      data: { ...base, requestKey: crypto.randomUUID(), date: today, time: sameDay.slots[0]?.time || "" },
    });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error).toMatch(/la veille/);
  }
  const bad = async (patch: Record<string, unknown>) =>
    (await request.post("/api/plateau", { headers, data: { ...base, requestKey: crypto.randomUUID(), ...patch } })).status();
  expect(await bad({ budget: "2" })).toBe(400);
  expect(await bad({ mode: "people", people: 0 })).toBe(400);
  expect(await bad({ plateauId: "inconnu" })).toBe(409);
  // Marinade seulement pour la pierrade marinée.
  expect(await bad({ marinade: "tandoori" })).toBe(400);
  expect(await bad({ plateauId: "pierrade-plancha", option: "Grillée" })).toBe(400);
});

test("livrets : catalogue 2026 et marinades à feuilleter, PDF téléchargeable", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/catalogue-des-fetes");
  const book = page.getByRole("region", { name: "Catalogue des fêtes 2026" });
  await expect(book.locator(".fb-count")).toContainText("Page 1");
  await book.getByRole("button", { name: "Page suivante" }).click();
  await expect(book.locator(".fb-count")).toContainText("Page 2–3");
  await expect(book.getByRole("img", { name: "Catalogue des fêtes 2026, page 3" })).toBeVisible();
  await book.locator(".fb-stage").press("ArrowRight");
  await expect(book.locator(".fb-count")).toContainText("Page 4–5");
  await book.getByRole("button", { name: "Page 28 et 29" }).click();
  await expect(book.getByRole("button", { name: "Page suivante" })).toBeDisabled();
  const pdf = await request.get("/catalogues/catalogue-fetes-2026.pdf");
  expect(pdf.headers()["content-type"]).toContain("pdf");
  expect((await pdf.body()).length).toBeLessThan(8_000_000);

  await page.goto("/lots-et-marinades");
  const marinades = page.getByRole("region", { name: "Nos marinades" });
  await expect(marinades.locator(".fb-count")).toContainText("/ 3");
  expect((await request.get("/catalogues/marinades.pdf")).ok()).toBeTruthy();
});
