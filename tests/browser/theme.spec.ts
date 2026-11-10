import { test, expect } from "@playwright/test";

test("le thème suit le système puis conserve le choix sur toutes les pages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(25, 24, 23)",
  );
  await page
    .getByRole("button", { name: "Activer le mode clair", exact: true })
    .click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  for (const path of [
    "/boutique",
    "/barbecue",
    "/notre-maison",
    "/contact",
    "/informations",
    "/commande",
  ]) {
    await page.goto(path);
    await expect(root).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Activer le mode clair", exact: true }),
    ).toBeVisible();
  }
  // L'application du boucher suit le même choix, avec ses couleurs iOS.
  await page.goto("/admin/connexion");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  expect(errors).toEqual([]);
});

test("le sélecteur reste accessible sur mobile et sans stockage local", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/");
  // Sur petit écran, le sélecteur est dans le menu.
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const toggle = page.getByRole("button", {
    name: "Activer le mode sombre",
    exact: true,
  });
  await expect(toggle).toBeInViewport();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Activer le mode clair", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
