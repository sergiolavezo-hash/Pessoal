import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests. Smoke tests run against any environment; full-flow tests
 * (signup -> connect -> dashboard) require a configured Supabase project —
 * they are skipped automatically when E2E_SUPABASE is not set.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // Reuse a system-provided Chromium when the exact Playwright browser
    // build is not downloaded (e.g. sandboxed CI images).
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/login",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
