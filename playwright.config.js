import { defineConfig, devices } from "@playwright/test";

// E2E config for the Internal Medicine quote-to-bind portal. Tests drive the
// real UI against the Vite dev server; every `ins` Weborder API call
// (/api/weborder/v1/**) is intercepted at the browser network layer via
// page.route in each spec's support module, so no live `ins` backend is
// required (see e2e/support/*). Mirrors Q2BNfy's e2e/playwright.config.js so
// the two sibling portals stay consistent.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial locally: several parallel Chromium instances hammering one local
  // Vite dev server (cold on-demand module compilation) causes real
  // page/button-wait timeouts (>30s) on a dev machine — not app or test
  // bugs. CI is assumed to run against a warmed/production-like server.
  workers: process.env.CI ? 2 : 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:4200",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4200",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
