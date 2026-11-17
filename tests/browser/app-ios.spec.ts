import { test, expect, devices, type APIRequestContext, type Page } from "@playwright/test";

// Faubourg Pro sur iPhone : jamais de dézoom, police système, barre d'onglets
// flottante qui s'efface au clavier, grand titre compacté, feuilles glissées.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };
const iphone = devices["iPhone 15"];

async function owner(request: APIRequestContext) {
  const setup = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (setup.status() !== 200) expect(setup.status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: auth })).ok()).toBeTruthy();
}

/** Demandes réparties sur plusieurs jours : beaucoup de filtres de dates
 * (créées une seule fois pour tout le fichier). */
let seeded = false;
async function seed(request: APIRequestContext) {
  if (seeded) return;
  seeded = true;
  const { dates } = await (await request.get("/api/creneaux")).json();
  for (const [n, d] of dates.slice(0, 5).entries())
    await request.post("/api/liste", {
      headers,
      data: {
        requestKey: crypto.randomUUID(),
        firstName: "Client",
        lastName: `Jour ${n + 1}`,
        // Un numéro propre à ce test : la limite d'envoi est par téléphone.
        phone: `06 50 40 30 2${n}`,
        email: "",
        date: d.date,
        time: d.slots[0].time,
        notes: "",
        items: [{ name: "Brochette de poulet provençale", quantity: "500", unit: "g", preparation: "" }],
      },
    });
}

const width = (page: Page) =>
  page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));

test("aucun écran ne dézoome l’iPhone, même avec beaucoup de filtres", async ({ browser, request }) => {
  await seed(request);
  await owner(request);
  const ctx = await browser.newContext({ ...iphone, baseURL: origin, storageState: await request.storageState() });
  const page = await ctx.newPage();
  const fonts: string[] = [];
  page.on("request", (r) => r.resourceType() === "font" && fonts.push(r.url()));
  for (const url of ["/admin", "/admin/commandes", "/admin/produits", "/admin/publications", "/admin/plus", "/admin/devis", "/admin/stock"]) {
    await page.goto(url);
    expect(await width(page), url).toEqual({ inner: iphone.viewport.width, scroll: iphone.viewport.width });
  }
  // Police du système uniquement : aucun fichier de police téléchargé.
  expect(fonts).toEqual([]);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ios")!).fontFamily)).toMatch(/^system-ui, -apple-system/);
  await ctx.close();
});

test("barre d’onglets flottante, masquée au clavier, grand titre compacté au défilement", async ({ browser, request }) => {
  await seed(request);
  await owner(request);
  const ctx = await browser.newContext({ ...iphone, baseURL: origin, storageState: await request.storageState() });
  const page = await ctx.newPage();
  await page.goto("/admin/commandes");
  const tabbar = page.getByRole("navigation", { name: "Navigation de l’application" });
  const box = (await tabbar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(14);
  expect(box.y + box.height).toBeLessThan(iphone.viewport.height - 8);
  expect(await tabbar.evaluate((e) => getComputedStyle(e).backdropFilter)).toContain("blur");

  // Le clavier s'ouvre : la barre d'onglets s'efface, puis revient.
  await page.getByLabel("Rechercher une commande").focus();
  await expect(page.locator("html")).toHaveClass(/kb-open/);
  await expect(tabbar).toHaveCSS("opacity", "0");
  await page.getByLabel("Rechercher une commande").blur();
  await expect(page.locator("html")).not.toHaveClass(/kb-open/);
  await expect(tabbar).toHaveCSS("opacity", "1");

  // Défilement : le grand titre s'efface, le titre compact apparaît.
  await page.evaluate(() => scrollTo(0, 300));
  await expect(page.locator(".nav-bar")).toHaveClass(/compact/);
  await expect(page.locator(".large-title")).toHaveCSS("opacity", "0");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".nav-bar")).not.toHaveClass(/compact/);

  // Carte de commande : l'action rapide ne recouvre pas le texte.
  const card = page.locator(".order-card.has-action").first();
  const quick = (await card.locator(".order-quick").boundingBox())!;
  for (const line of await card.locator(".order-lines li, h3").all()) {
    const b = (await line.boundingBox())!;
    expect(b.y + b.height <= quick.y || b.y >= quick.y + quick.height, "texte sous le bouton").toBe(true);
  }
  await ctx.close();
});

test("feuille modale fermée en la faisant glisser vers le bas, thème sombre et barre d’état", async ({ browser, request }) => {
  await seed(request);
  await owner(request);
  const { orders } = await (await request.get("/api/admin/orders")).json();
  const order = orders.find((o: { status: string }) => o.status === "Demande reçue");
  const ctx = await browser.newContext({ ...iphone, baseURL: origin, colorScheme: "dark", storageState: await request.storageState() });
  const page = await ctx.newPage();
  await page.goto(`/admin/commandes/${order.id}`);
  // Barre d'état iOS de la couleur de l'écran.
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#000000");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");

  await page.getByRole("button", { name: "Annuler la commande" }).click();
  const sheet = page.getByRole("dialog", { name: "Annuler la commande" });
  await expect(sheet).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/sheet-open/);
  // Glissement du doigt vers le bas depuis le contenu de la feuille.
  await page.locator("dialog[open] .sheet-body").evaluate(async (body) => {
    const target = body as HTMLElement;
    const r = target.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const touch = (y: number) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const fire = (type: string, y: number) =>
      target.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === "touchend" ? [] : [touch(y)],
          changedTouches: [touch(y)],
        }),
      );
    const y0 = r.top + 20;
    fire("touchstart", y0);
    for (let d = 10; d <= 260; d += 25) {
      fire("touchmove", y0 + d);
      await new Promise((ok) => setTimeout(ok, 16));
    }
    fire("touchend", y0 + 260);
  });
  await expect(sheet).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/sheet-open/);
  // Rien n'a été annulé.
  const after = (await (await request.get("/api/admin/orders")).json()).orders.find((o: { id: string }) => o.id === order.id);
  expect(after.status).toBe("Demande reçue");
  await ctx.close();
});
