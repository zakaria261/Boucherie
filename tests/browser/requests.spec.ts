import { test, expect, devices, type Page, type APIRequestContext, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";

// Parcours métier : liste de courses, demandes professionnelles, préparation,
// devis, import photo, fidélité, équipe et sécurité.
const origin = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
const auth = { email: "proprietaire@example.com", password: "Une-boucherie-2026-solide!" };
const headers = { Origin: origin };
const SIRET = "73282932000074";

async function setup(request: APIRequestContext) {
  const response = await request.post("/api/auth/setup", { headers, data: { ...auth, token: "test-installation-token-only" } });
  if (response.status() !== 200) expect(response.status()).toBe(403);
}
async function loginApi(request: APIRequestContext, credentials = auth) {
  const response = await request.post("/api/auth/login", { headers, data: credentials });
  expect(response.ok()).toBeTruthy();
}
async function login(page: Page, next = "/admin") {
  await page.goto(`/admin/connexion?suite=${encodeURIComponent(next)}`);
  await page.getByLabel("Votre e-mail").fill(auth.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(auth.password);
  await page.getByRole("button", { name: "Entrer dans ma boutique" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[/?]/g, "\\$&")}$`), { timeout: 20000 });
}
/** Session administrateur réutilisable (une seule connexion). */
async function adminState(playwright: { request: { newContext: (o: { baseURL: string }) => Promise<APIRequestContext> } }) {
  const ctx = await playwright.request.newContext({ baseURL: origin });
  await loginApi(ctx);
  const state = await ctx.storageState();
  await ctx.dispose();
  return state;
}
/** Navigation tolérante aux rechargements du serveur de développement. */
async function visit(page: Page, path: string) {
  try {
    await page.goto(path);
  } catch {
    await page.goto(path);
  }
}
async function freeSlot(request: APIRequestContext, skip = 0) {
  const { dates } = (await (await request.get("/api/creneaux")).json()) as {
    dates: { date: string; slots: { time: string; full: boolean }[] }[];
  };
  const all = dates.flatMap((d) => d.slots.filter((s) => !s.full).map((s) => ({ date: d.date, time: s.time })));
  return all[skip] || all[0];
}
const listeBody = (slot: { date: string; time: string }, patch: Record<string, unknown> = {}) => ({
  requestKey: crypto.randomUUID(),
  firstName: "Camille",
  lastName: "Martin",
  phone: "06 11 22 33 44",
  email: "",
  date: slot.date,
  time: slot.time,
  notes: "",
  items: [
    { name: "Viande hachée", quantity: "500", unit: "g", note: "" },
    { name: "Rôti de veau", quantity: "1", unit: "kg", note: "Ficelé" },
  ],
  ...patch,
});
const proBody = (slot: { date: string; time: string }, patch: Record<string, unknown> = {}) => ({
  requestKey: crypto.randomUUID(),
  requestType: "commande",
  contactName: "Paul Bernard",
  company: "Bistrot du Coin",
  country: "France",
  siret: SIRET,
  noSiret: false,
  noSiretReason: "",
  foreignId: "",
  activity: "Restaurant",
  activityOther: "",
  phone: "03 22 00 00 00",
  email: "chef@bistrot.example",
  billingAddress: "",
  vatNumber: "",
  poReference: "BC-42",
  date: slot.date,
  time: slot.time,
  slotMode: "impératif",
  pickupContact: "",
  eventDate: "",
  covers: null,
  recurrence: "ponctuel",
  recurrenceDetail: "",
  contactPreference: "téléphone",
  notes: "Steaks bien parés",
  items: [
    { name: "Steak haché", quantity: "40", unit: "piece", portionGrams: "150", packaging: "Sous vide par 10", cut: "", note: "" },
    { name: "Bavette", quantity: "3", unit: "kg", portionGrams: "", packaging: "", cut: "Tranches de 2 cm", note: "" },
  ],
  ...patch,
});
async function adminOrders(request: APIRequestContext) {
  return (await (await request.get("/api/admin/orders")).json()).orders as {
    id: string;
    token: string;
    status: string;
    origin: string;
    customerType: string;
    updatedAt: string;
    items: { name: string; prepared?: boolean }[];
    internalNotes?: unknown[];
    pro?: Record<string, unknown>;
  }[];
}

test.beforeAll(async ({ request }) => setup(request));

test("B — liste de courses sans e-mail : saisie, modification, envoi, note, PDF, réception boucher", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/commande");
  await page.getByRole("link", { name: /Ma liste de courses/ }).first().click();
  await expect(page).toHaveURL("/liste-de-courses");
  await expect(page.getByRole("heading", { name: "Votre liste, préparée par votre boucher." })).toBeVisible();
  await expect(page.getByText("Notre vitrine évolue chaque jour !", { exact: false })).toBeVisible();
  // Les exemples sont indicatifs : aucune ligne n'est préremplie.
  await expect(page.locator(".list-name")).toHaveValue("");

  // Envoi vide refusé dans le navigateur.
  await page.getByRole("button", { name: "Vérifier ma liste" }).click();
  await expect(page.getByText("Indiquez votre prénom.")).toBeVisible();
  await expect(page.getByText("Ajoutez au moins un article complet", { exact: false })).toBeVisible();

  await page.getByLabel("Prénom").fill("Léa");
  await page.getByLabel("Nom", { exact: true }).fill("Durand");
  await page.getByLabel("Téléphone").fill("06 98 76 54 32");
  const rows = [
    ["Viande hachée", "500", "g"],
    ["Brochettes de poulet", "6", "pièces"],
    ["Rôti de veau", "1", "kg"],
  ];
  for (const [n, [name, qty, unit]] of rows.entries()) {
    if (n > 0) await page.getByRole("button", { name: "Ajouter un article" }).click();
    await page.getByLabel(`Article ${n + 1}`, { exact: true }).fill(name);
    await page.getByLabel(`Quantité de l’article ${n + 1}`).fill(qty);
    await page.getByRole("radiogroup", { name: `Unité de l’article ${n + 1}` }).getByRole("radio", { name: unit, exact: true }).click();
  }
  await page.getByLabel("Précisions pour l’article 3").fill("Bien ficelé");
  // Ligne vide supplémentaire : ignorée.
  await page.getByRole("button", { name: "Ajouter un article" }).click();
  await page.getByLabel("Instructions complémentaires").fill("Merci !");
  await page.locator(".day-picker button").first().click();
  await page.locator(".slot-grid button:not([disabled])").first().click();
  await page.getByRole("button", { name: "Vérifier ma liste" }).click();

  // Récapitulatif, puis retour en modification sans perte.
  const recap = page.getByRole("article", { name: "Récapitulatif de votre liste" });
  await expect(recap).toContainText("Brochettes de poulet");
  await expect(recap).toContainText("6 pièces");
  await expect(page.getByText("Les produits sont soumis à disponibilité.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByLabel("Article 2", { exact: true })).toHaveValue("Brochettes de poulet");
  await page.getByLabel("Quantité de l’article 2").fill("8");
  await page.getByRole("button", { name: "Vérifier ma liste" }).click();
  await expect(recap).toContainText("8 pièces");

  // Envoi : double appui sans doublon.
  const send = page.getByRole("button", { name: "Envoyer ma demande de commande" });
  await send.dblclick();
  await expect(page).toHaveURL(/\/commande\/suivi\/[a-f0-9]{48}\?confirmation=1/, { timeout: 30000 });
  await expect(page.getByText("Votre demande de commande a bien été reçue !")).toBeVisible();
  await expect(page.getByText("Merci pour votre confiance ! Notre équipe va vérifier votre demande", { exact: false })).toBeVisible();
  const reference = (await page.locator(".confirm-ref").first().textContent())!.replace("Référence ", "").trim();
  expect(reference).toMatch(/^LC-[A-F0-9]{8}$/);
  const note = page.getByRole("article", { name: "Ma liste de courses" });
  await expect(note.locator(".checklist li")).toHaveCount(3);
  // Cases personnelles : gardées sur l'appareil.
  await note.getByRole("checkbox").first().check();
  await page.reload();
  await expect(page.getByRole("article", { name: "Ma liste de courses" }).getByRole("checkbox").first()).toBeChecked();
  // Téléchargement (PDF) et impression.
  const href = await page.getByRole("link", { name: "Télécharger ma liste" }).getAttribute("href");
  const pdf = await request.get(href!);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.evaluate(() => ((window as unknown as { printed: number }).printed = 0, (window.print = () => ((window as unknown as { printed: number }).printed += 1))));
  await page.getByRole("button", { name: "Imprimer ma liste" }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);

  // Une seule demande enregistrée, reçue côté boucher.
  await loginApi(request);
  const orders = (await adminOrders(request)).filter((o) => o.id === reference);
  expect(orders).toHaveLength(1);
  expect(orders[0].origin).toBe("liste");
  expect(orders[0].status).toBe("Demande reçue");
  expect(orders[0].items.map((i) => i.name)).toEqual(["Viande hachée", "Brochettes de poulet", "Rôti de veau"]);

  const admin = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const app = await admin.newPage();
  await login(app, "/admin/commandes");
  await app.getByRole("tab", { name: /Demandes/ }).click();
  const card = app.locator(".order-card", { hasText: reference.replace("LC-", "#") });
  await expect(card.getByText("Liste de courses")).toBeVisible();
  await card.locator(".order-card-link").click();
  await expect(app).toHaveURL(/\/admin\/commandes\/LC-/, { timeout: 30000 });
  await expect(app.locator(".prep-line", { hasText: "Brochettes de poulet" })).toContainText("8 pièces");
  await expect(app.locator(".prep-line", { hasText: "Rôti de veau" })).toContainText("Bien ficelé");
  await expect(app.getByRole("checkbox", { name: "Rôti de veau préparé" })).toBeDisabled();
  await ctx.close();
  await admin.close();
});

test("C — validation serveur des listes : erreurs, créneaux, doublons et nouvelle tentative", async ({ request }) => {
  const slot = await freeSlot(request);
  const bad = async (patch: Record<string, unknown>, message: RegExp) => {
    const response = await request.post("/api/liste", { headers, data: listeBody(slot, patch) });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(message);
  };
  await bad({ items: [{ name: "", quantity: "1", unit: "kg" }] }, /Indiquez l’article/);
  await bad({ items: [{ name: "Bœuf", quantity: "0", unit: "kg" }] }, /supérieure à zéro/);
  await bad({ items: [{ name: "Bœuf", quantity: "-2", unit: "kg" }] }, /supérieure à zéro/);
  await bad({ items: [{ name: "Bœuf", quantity: "1", unit: "" }] }, /unité/);
  await bad({ items: [{ name: "Saucisses", quantity: "2,5", unit: "piece" }] }, /entier/);
  await bad({ items: [] }, /au moins un article/);
  await bad({ phone: "12" }, /Téléphone|téléphone/);
  await bad({ date: "2020-01-01" }, /pas disponible/);
  await bad({ time: "03:00" }, /créneau/i);
  await bad({ time: "21:00" }, /créneau/i);
  // Aucune page d'erreur ne contient de pile technique.
  expect((await request.post("/api/liste", { headers: {}, data: listeBody(slot) })).status()).toBe(403);

  // Double envoi simultané et nouvelle tentative : une seule demande.
  const body = listeBody(slot);
  const [a, b] = await Promise.all([
    request.post("/api/liste", { headers, data: body }),
    request.post("/api/liste", { headers, data: body }),
  ]);
  const ids = [(await a.json()).id, (await b.json()).id];
  expect(ids[0]).toBe(ids[1]);
  const retry = await request.post("/api/liste", { headers, data: body });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).id).toBe(ids[0]);
  await loginApi(request);
  expect((await adminOrders(request)).filter((o) => o.id === ids[0])).toHaveLength(1);
});

test("D — préparation : cases persistantes, partagées entre deux sessions, sans changer le statut", async ({ browser, request }) => {
  const slot = await freeSlot(request, 1);
  const created = await (await request.post("/api/liste", { headers, data: listeBody(slot) })).json();
  await loginApi(request);
  // Avant acceptation, la préparation est refusée par le serveur.
  const early = await request.patch(`/api/admin/orders/${created.id}/lignes/0`, { headers, data: { name: "Viande hachée", prepared: true } });
  expect(early.status()).toBe(409);
  const order = (await adminOrders(request)).find((o) => o.id === created.id)!;
  expect((await request.patch(`/api/admin/orders/${created.id}`, { headers, data: { status: "Acceptée", updatedAt: order.updatedAt } })).status()).toBe(200);

  const one = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const two = await browser.newContext({ ...devices["Pixel 7"], baseURL: origin });
  const a = await one.newPage();
  const b = await two.newPage();
  await login(a, `/admin/commandes/${created.id}`);
  await login(b, `/admin/commandes/${created.id}`);
  await a.getByRole("checkbox", { name: "Viande hachée préparé" }).check();
  await expect(a.getByRole("checkbox", { name: "Viande hachée préparé" })).toBeChecked();
  // L'autre appareil voit la case cochée (synchronisation automatique).
  await expect(b.getByRole("checkbox", { name: "Viande hachée préparé" })).toBeChecked({ timeout: 15000 });
  await b.getByRole("checkbox", { name: "Rôti de veau préparé" }).check();
  await a.reload();
  await expect(a.getByRole("checkbox", { name: "Rôti de veau préparé" })).toBeChecked();
  await expect(a.getByText("Préparation · 2/2")).toBeVisible();
  // Poids, remplacement et prix final d'une ligne libre.
  await a.getByRole("button", { name: "Détails de Rôti de veau" }).click();
  const sheet = a.getByRole("dialog", { name: "Rôti de veau" });
  await sheet.getByLabel("Poids réellement préparé (g)").fill("1080");
  await sheet.getByLabel("Prix final de la ligne (€)").fill("32,40");
  await sheet.getByRole("button", { name: "Enregistrer" }).click();
  await expect(a.getByText("Préparé : 1,08 kg")).toBeVisible();
  // Une ligne sans prix final laisse le total « à confirmer ».
  await expect(a.locator(".total-row .row-value")).toHaveText("À confirmer");
  const after = (await adminOrders(request)).find((o) => o.id === created.id)!;
  expect(after.status).toBe("Acceptée");
  expect(after.items.every((i) => i.prepared)).toBe(true);
  // Le client ne voit ni l'état de préparation ni les notes internes.
  expect((await request.post(`/api/admin/orders/${created.id}/notes`, { headers, data: { text: "Client rappelé" } })).status()).toBe(200);
  const publicView = await (await request.get(`/api/orders/${created.token}`)).json();
  expect(JSON.stringify(publicView)).not.toContain("prepared");
  expect(JSON.stringify(publicView)).not.toContain("Client rappelé");
  await one.close();
  await two.close();
});

test("E — devis PRO : demande, file Devis, établissement, PDF, acceptation, conversion unique", async ({ browser, request }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const page = await ctx.newPage();
  await page.goto("/professionnels");
  await expect(page.getByRole("heading", { name: "Vos commandes professionnelles, préparées avec soin." })).toBeVisible();
  await page.getByRole("link", { name: /Demander un devis/ }).click();
  await page.getByLabel("Prénom et nom du contact").fill("Sophie Leroy");
  await page.getByLabel("Entreprise ou structure").fill("Traiteur Leroy");
  await page.getByLabel("Type d’activité").selectOption("Traiteur");
  await page.getByLabel("SIRET", { exact: true }).fill("12345678901234");
  await page.getByLabel("Téléphone", { exact: true }).fill("06 55 44 33 22");
  await page.getByLabel("E-mail professionnel").fill("contact@leroy.example");
  await page.getByLabel("Article 1", { exact: true }).fill("Gigot d’agneau");
  await page.getByLabel("Quantité totale de l’article 1").fill("12");
  await page.getByRole("radiogroup", { name: "Unité de l’article 1" }).getByRole("radio", { name: "pièces" }).click();
  await page.getByLabel("Poids cible par pièce (g)").fill("2200");
  await expect(page.getByText("Poids total indicatif : 26,4 kg", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Vérifier ma demande" }).click();
  await expect(page.getByText("Le SIRET doit comporter 14 chiffres valides.")).toBeVisible();
  await page.getByLabel("SIRET", { exact: true }).fill(SIRET);
  await page.getByRole("button", { name: "Vérifier ma demande" }).click();
  await expect(page.getByText("Aucun tarif professionnel, délai de paiement", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Envoyer ma demande de devis" }).click();
  await expect(page).toHaveURL(/\/professionnels\/devis\/[a-f0-9]{48}\?confirmation=1/, { timeout: 30000 });
  await expect(page.getByText("Votre demande professionnelle a bien été reçue.")).toBeVisible();
  await expect(page.getByText("Cet accusé de réception ne vaut pas acceptation de la commande.", { exact: false })).toBeVisible();
  const clientUrl = page.url().split("?")[0];
  const ref = (await page.locator(".confirm-ref").textContent())!.replace("Référence ", "").trim();
  const requestPdf = await request.get(`/api/documents/devis/${clientUrl.split("/").pop()}`);
  expect((await requestPdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // Côté boucher : la demande est dans les devis, pas dans les commandes à préparer.
  await loginApi(request);
  expect((await adminOrders(request)).some((o) => o.id === ref)).toBe(false);
  const admin = await browser.newContext({ ...devices["iPhone 13"], baseURL: origin });
  const app = await admin.newPage();
  await login(app, "/admin/devis");
  await app.getByRole("link", { name: /Traiteur Leroy/ }).click();
  await expect(app.getByText("Demande du client")).toBeVisible();
  // Établir sans prix : refusé.
  await app.getByRole("button", { name: "Passer en étude" }).click();
  await expect(app.getByRole("button", { name: "Établir le devis" })).toBeVisible();
  await app.getByRole("button", { name: "Établir le devis" }).click();
  await expect(app.locator(".content").getByText("Chaque ligne doit avoir un prix", { exact: false })).toBeVisible();
  await app.getByLabel("PU HT €").fill("24,50");
  await app.getByLabel("Valable jusqu’au").fill(new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10));
  await app.getByRole("button", { name: "Enregistrer le devis" }).click();
  // 12 × 24,50 = 294,00 HT ; TVA 5,5 % = 16,17 ; TTC 310,17.
  await expect(app.locator(".total-row .row-value.strong")).toHaveText(/310,17/);
  await app.getByRole("button", { name: "Établir le devis" }).click();
  await expect(app.locator(".detail-sub")).toContainText(/Devis D\d{4}-\d{4}/);
  const quotes = (await (await request.get("/api/admin/devis")).json()).quotes as { id: string; number: string; version: number; status: string }[];
  const quote = quotes.find((q) => q.id === ref)!;
  expect(quote.status).toBe("Devis établi");
  const pdf = await request.get(`/api/admin/devis/${quote.id}/pdf`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  // Le client voit désormais le devis chiffré.
  await page.goto(clientUrl);
  await expect(page.getByText("310,17", { exact: false }).first()).toBeVisible();
  await app.getByRole("button", { name: "Marquer comme envoyé" }).click();
  await app.getByRole("button", { name: "Marquer comme accepté" }).click();
  await app.getByRole("button", { name: "Convertir en commande" }).click();
  const slot = await freeSlot(request, 2);
  await app.getByRole("dialog", { name: "Convertir en commande" }).getByLabel("Date de retrait").fill(slot.date);
  await app.getByRole("button", { name: "Créer la commande" }).click();
  await expect(app).toHaveURL(/\/admin\/commandes\/FB-[A-F0-9]{8}$/, { timeout: 30000 });
  await expect(app.getByText("Devis d’origine")).toBeVisible();
  // Seconde conversion impossible.
  const converted = (await (await request.get("/api/admin/devis")).json()).quotes.find((q: { id: string }) => q.id === ref);
  expect(converted.status).toBe("Converti en commande");
  const again = await request.post(`/api/admin/devis/${ref}/convertir`, { headers, data: { version: converted.version, date: slot.date, time: "" } });
  expect(again.status()).toBe(409);
  await ctx.close();
  await admin.close();
});

test("F et G — demandes PRO : commande à valider, cas particuliers, besoin récurrent", async ({ request }) => {
  const slot = await freeSlot(request, 3);
  await loginApi(request);
  const before = (await adminOrders(request)).length;
  const created = await request.post("/api/pro", { headers, data: proBody(slot, { recurrence: "hebdomadaire", recurrenceDetail: "Chaque vendredi", slotMode: "flexible" }) });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect(id).toMatch(/^PR-/);
  const orders = await adminOrders(request);
  // Besoin récurrent : une seule commande, aucune commande future créée.
  expect(orders.length).toBe(before + 1);
  const order = orders.find((o) => o.id === id)!;
  expect(order.customerType).toBe("pro");
  expect(order.status).toBe("Demande reçue");
  expect(order.pro).toMatchObject({ recurrence: "hebdomadaire", slotMode: "flexible", poReference: "BC-42" });
  expect(order.items[0]).toMatchObject({ quantity: 40, unit: "piece", portionGrams: 150, packaging: "Sous vide par 10" });
  // N'entre pas en préparation avant acceptation.
  expect((await request.patch(`/api/admin/orders/${id}/lignes/0`, { headers, data: { name: "Steak haché", prepared: true } })).status()).toBe(409);

  // Association sans SIRET : acceptée si la situation est précisée.
  const asso = (p: Record<string, unknown>) =>
    request.post("/api/pro", { headers, data: proBody(slot, { requestType: "devis", company: "Amicale des pompiers", activity: "Association", siret: "", ...p }) });
  expect((await asso({ noSiret: true, noSiretReason: "" })).status()).toBe(400);
  expect((await asso({ noSiret: true, noSiretReason: "Association loi 1901 non immatriculée" })).status()).toBe(201);
  expect((await asso({ noSiret: false })).status()).toBe(400);
  // Entreprise étrangère : pas de SIRET exigé.
  expect(
    (await request.post("/api/pro", { headers, data: proBody(slot, { requestType: "devis", country: "Belgique", siret: "", foreignId: "BE0123456789", email: "achat@frites.example" }) })).status(),
  ).toBe(201);
  // TVA au mauvais format, e-mail manquant : refusés.
  expect((await request.post("/api/pro", { headers, data: proBody(slot, { vatNumber: "12345" }) })).status()).toBe(400);
  expect((await request.post("/api/pro", { headers, data: proBody(slot, { email: "" }) })).status()).toBe(400);
  // Demande de commande sans date : refusée ; devis sans date : accepté.
  expect((await request.post("/api/pro", { headers, data: proBody(slot, { date: "", time: "" }) })).status()).toBe(400);
  expect((await request.post("/api/pro", { headers, data: proBody(slot, { requestType: "devis", date: "", time: "" }) })).status()).toBe(201);
  // Fiche entreprise unique pour un même SIRET.
  const { companies } = await (await request.get("/api/admin/clients")).json();
  expect(companies.filter((c: { siret: string }) => c.siret === SIRET)).toHaveLength(1);
});

test("Import photo, saisie manuelle et fidélité sur montant encaissé", async ({ request }) => {
  await loginApi(request);
  const photo = readFileSync("public/images/merguez-maison.jpg");
  const upload = await request.post("/api/admin/media", { headers: { ...headers, "Content-Type": "image/jpeg" }, data: photo });
  expect(upload.status()).toBe(201);
  const { id: mediaId } = await upload.json();
  const dup = await (await request.post("/api/admin/media", { headers: { ...headers, "Content-Type": "image/jpeg" }, data: photo })).json();
  expect(dup).toMatchObject({ id: mediaId, duplicate: true });
  const media = await request.get(`/api/admin/media/${mediaId}`);
  expect(media.headers()["content-type"]).toBe("image/webp");
  // Fichier non image refusé.
  expect((await request.post("/api/admin/media", { headers, data: Buffer.from("<script>alert(1)</script>") })).status()).toBe(400);

  // Fidélité : désactivée, aucune règle ne peut être activée sans validation.
  expect((await request.put("/api/admin/fidelite", { headers, data: { enabled: true, pointsPerEuro: 1, threshold: 100, reward: "Un bon d’achat" } })).status()).toBe(400);
  expect(
    (await request.put("/api/admin/fidelite", { headers, data: { enabled: true, approved: true, pointsPerEuro: 1, threshold: 50, reward: "Un bon d’achat de 5 €", validityMonths: 12, exclusions: "" } })).status(),
  ).toBe(200);

  const date = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const manual = await request.post("/api/admin/orders", {
    headers,
    data: {
      requestKey: crypto.randomUUID(),
      origin: "photo",
      name: "Jean Petit",
      phone: "+33 6 12 12 12 12",
      email: "",
      date,
      time: "10:00",
      notes: "",
      catalog: [],
      free: [{ name: "Côtes de porc", quantity: "4", unit: "piece", note: "" }],
      mediaId,
    },
  });
  expect(manual.status()).toBe(201);
  const { order } = await manual.json();
  expect(order).toMatchObject({ origin: "photo", status: "Acceptée", mediaId, total: null });
  const move = async (status: string, paidAmount?: number) => {
    const current = (await adminOrders(request)).find((o) => o.id === order.id)!;
    return request.patch(`/api/admin/orders/${order.id}`, { headers, data: { status, updatedAt: current.updatedAt, paidAmount } });
  };
  expect((await move("Prête")).status()).toBe(200);
  expect((await move("Retirée", 6390)).status()).toBe(200);
  const accounts = (await (await request.get("/api/admin/fidelite?q=0612121212")).json()).accounts;
  expect(accounts[0]).toMatchObject({ phone: "0612121212", balance: 63 });
  // Une commande retirée ne peut pas l'être deux fois (pas de double crédit).
  expect((await move("Retirée", 6390)).status()).toBe(409);
  // Ajustement sans motif refusé ; récompense impossible sans solde suffisant… puis possible.
  expect((await request.post("/api/admin/fidelite/0612121212", { headers, data: { type: "ajustement", points: 5, reason: "" } })).status()).toBe(400);
  expect((await request.post("/api/admin/fidelite/0612121212", { headers, data: { type: "utilisation" } })).status()).toBe(200);
  const tracking = await (await request.get(`/api/fidelite?token=${order.token}`)).json();
  expect(tracking).toMatchObject({ enabled: true, balance: 13 });
  // Une simple demande ne rapporte rien.
  const slot = await freeSlot(request, 4);
  const liste = await (await request.post("/api/liste", { headers, data: listeBody(slot, { phone: "06 12 12 12 12" }) })).json();
  expect((await (await request.get(`/api/fidelite?token=${liste.token}`)).json()).balance).toBe(13);
  // Désactivation pour la suite des tests.
  await request.put("/api/admin/fidelite", { headers, data: { enabled: false, pointsPerEuro: 1, threshold: 50, reward: "Un bon d’achat de 5 €", validityMonths: 12 } });
});

test("H — sécurité : accès non authentifié, collaborateur, notes internes, injection", async ({ playwright, browser }) => {
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  for (const url of ["/api/admin/orders", "/api/admin/devis", "/api/admin/fidelite", "/api/admin/journal", "/api/admin/media/0123456789abcdef0123456789abcdef", "/api/admin/devis/DV-00000000/pdf"])
    expect((await anonymous.get(url)).status(), url).toBe(401);
  expect((await anonymous.post("/api/admin/orders", { headers, data: {} })).status()).toBe(401);
  expect((await anonymous.get(`/api/orders/${"a".repeat(48)}`)).status()).toBe(404);
  expect((await anonymous.get(`/api/documents/commande/${"a".repeat(48)}`)).status()).toBe(404);
  expect((await anonymous.get(`/professionnels/espace/${"a".repeat(48)}`)).status()).toBe(404);

  // Collaborateur : commandes oui, réglages, équipe, journal et sauvegarde non.
  const owner = await playwright.request.newContext({ baseURL: origin });
  await loginApi(owner);
  const staff = { email: `equipe-${Date.now()}@example.com`, password: "Collaborateur-2026!" };
  expect((await owner.post("/api/admin/equipe", { headers, data: { ...staff, name: "Nora" } })).status()).toBe(201);
  const member = await playwright.request.newContext({ baseURL: origin });
  await loginApi(member, staff);
  expect((await member.get("/api/admin/orders")).status()).toBe(200);
  expect((await member.get("/api/admin/journal")).status()).toBe(403);
  expect((await member.get("/api/admin/equipe")).status()).toBe(403);
  expect((await member.get("/api/admin/sauvegarde")).status()).toBe(403);
  expect((await member.put("/api/admin/settings", { headers, data: { version: 1 } })).status()).toBe(403);
  expect((await member.put("/api/admin/fidelite", { headers, data: { enabled: false } })).status()).toBe(403);
  const journal = await (await owner.get("/api/admin/journal")).json();
  expect(journal.entries.some((e: { action: string }) => e.action === "equipe.ajout")).toBe(true);

  // Injection : le texte saisi est affiché tel quel, jamais exécuté.
  const { dates } = await (await anonymous.get("/api/creneaux")).json();
  const slot = { date: dates[0].date, time: dates[0].slots.find((s: { full: boolean }) => !s.full).time };
  const evil = await (
    await anonymous.post("/api/liste", { headers, data: listeBody(slot, { firstName: "<img src=x onerror=alert(1)>", items: [{ name: "<script>alert(2)</script>", quantity: "1", unit: "kg" }] }) })
  ).json();
  const page = await (await browser.newContext({ baseURL: origin })).newPage();
  let dialogs = 0;
  page.on("dialog", (d) => (dialogs++, d.dismiss()));
  await page.goto(`/commande/suivi/${evil.token}`);
  await expect(page.getByText("<script>alert(2)</script>")).toBeVisible();
  expect(dialogs).toBe(0);

  // Espace pro : uniquement les demandes de l'entreprise.
  const { companies } = await (await owner.get("/api/admin/clients")).json();
  const [first, second] = companies as { id: string; name: string; accessToken: string }[];
  const space = await (await anonymous.get(`/professionnels/espace/${first.accessToken}`)).text();
  const others = (await (await owner.get("/api/admin/orders")).json()).orders.filter(
    (o: { companyId?: string }) => o.companyId && o.companyId !== first.id,
  );
  for (const o of others) expect(space).not.toContain(o.id);
  expect(space).toContain(first.name);
  if (second) expect(space).not.toContain(second.accessToken);
  await anonymous.dispose();
  await owner.dispose();
  await member.dispose();
});

test("Écrans clés sans débordement sur iPhone SE, Android, iPad et ordinateur", async ({ browser, playwright }) => {
  test.setTimeout(240000);
  const storageState = await adminState(playwright);
  const formats: [string, Parameters<Browser["newContext"]>[0]][] = [
    ["iPhone SE", devices["iPhone SE"]],
    ["Pixel 7", devices["Pixel 7"]],
    ["Galaxy compact", { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
    ["iPad", devices["iPad (gen 7)"]],
    ["Ordinateur", { viewport: { width: 1366, height: 900 } }],
  ];
  for (const [name, device] of formats) {
    for (const scheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ ...device, baseURL: origin, colorScheme: scheme, storageState });
      const page = await ctx.newPage();
      for (const path of ["/liste-de-courses", "/professionnels", "/professionnels/demande?type=commande"]) {
        await visit(page, path);
        await expect(page.locator("h1")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name} ${scheme} ${path}`).toBe(true);
      }
      for (const path of ["/admin/devis", "/admin/clients", "/admin/commandes/nouvelle", "/admin/plus/fidelite"]) {
        await visit(page, path);
        await expect(page.locator(".nav-bar").last()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name} ${scheme} ${path}`).toBe(true);
      }
      await ctx.close();
    }
  }
});
