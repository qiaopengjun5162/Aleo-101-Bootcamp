import { test, expect } from "../fixtures/test";

/**
 * Smoke: app boots, title is correct, and the hero landing CTA renders.
 * No wallet needed — this is the unauthenticated "hero" tab (App default).
 */
test("smoke: page loads with hero CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PII|Aleo/);

  // Hero CTA (i18n `t.hero.cta` = "Start recording") is visible on first load.
  await expect(
    page.getByRole("button", { name: /start recording/i }),
  ).toBeVisible();

  await expect(page).toHaveScreenshot("smoke-initial-load.png", {
    fullPage: true,
  });
});
