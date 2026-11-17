import { defineConfig } from "@playwright/test";
const port = Number(process.env.E2E_PORT || 3100);
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  // Serveur de développement : chaque écran est compilé à sa première visite.
  expect: { timeout: 15000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    // E2E_PROD=1 : version de production déjà construite (npm run build avec
    // NEXT_DIST_DIR=.next-build), plus rapide et identique à la mise en ligne.
    command: process.env.E2E_PROD
      ? `npx next start --hostname 127.0.0.1 --port ${port}`
      : `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_DIST_DIR: process.env.E2E_PROD ? ".next-build" : `.next-e2e-${port}`,
      BOUCHERIE_DATA_DIR:
        process.env.E2E_DATA_DIR || `/tmp/faubourg-e2e-${Date.now()}`,
      ADMIN_SETUP_TOKEN: "test-installation-token-only",
      // La suite se connecte bien plus souvent qu'un boucher : limite élevée en test.
      AUTH_GLOBAL_LIMIT: "1000",
      APP_ORIGIN: `http://127.0.0.1:${port}`,
    },
  },
});
