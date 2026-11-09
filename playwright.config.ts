import { defineConfig } from "@playwright/test";
const port = Number(process.env.E2E_PORT || 3100);
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_DIST_DIR: `.next-e2e-${port}`,
      BOUCHERIE_DATA_DIR:
        process.env.E2E_DATA_DIR || `/tmp/faubourg-e2e-${Date.now()}`,
      ADMIN_SETUP_TOKEN: "test-installation-token-only",
      APP_ORIGIN: `http://127.0.0.1:${port}`,
    },
  },
});
