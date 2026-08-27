import { test, expect } from "@playwright/test";

// Full product flow: requires a real Supabase project with migrations
// applied (set E2E_SUPABASE=1 plus the app's env). Kept separate so smoke
// tests stay runnable anywhere.
const enabled = Boolean(process.env.E2E_SUPABASE);

test.describe("full flow", () => {
  test.skip(!enabled, "E2E_SUPABASE not configured");

  const email = `e2e+${Date.now()}@example.com`;
  const password = "e2e-password-123!";

  test("signup -> onboarding -> workspace overview", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E User");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    // With email confirmation disabled the app goes straight to onboarding.
    await page.waitForURL(/\/(onboarding|login)/, { timeout: 15_000 });
    if (page.url().includes("/onboarding")) {
      await page.getByLabel("Organization name").fill("E2E Org");
      await page.getByRole("button", { name: "Create workspace" }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      await expect(page.getByText("Welcome back")).toBeVisible();
    }
  });
});
