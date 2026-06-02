import { test, expect } from "../fixtures/test";
import { injectMockWallet } from "../fixtures/mock-wallet";
import {
  connectMockWallet,
  getCapturedTxs,
  goToInputTab,
  goToManageTab,
} from "../fixtures/helpers";

/**
 * IC-05: Error handling on the refactored tab-based PII console.
 *
 * Sub-cases:
 *   - IC-05-01: Unconnected — both the Input and Manage tabs gate their content
 *     behind a wallet connection and render the page-level connect prompt
 *     (`t.wallet.connect` = "Connect wallet"). No submit button is reachable.
 *   - IC-05-02: Connected + empty form — the default ADDRESS category has empty
 *     required fields, so the "Submit on-chain" button is disabled and a forced
 *     click captures no transaction (handler short-circuits on `!result.valid`).
 *   - IC-05-03: Wallet rejects `requestTransaction` — `StatusBadge` surfaces a
 *     failure (`role="alert"`) carrying the rejection message; no success badge.
 */
test.describe("IC-05: error handling", () => {
  test("IC-05-01: unconnected tabs show connect prompt", async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/");

    // Input tab: gated behind connection -> "Connect wallet" prompt, no submit.
    await goToInputTab(page);
    await expect(
      page.getByText("Connect wallet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit on-chain", exact: true }),
    ).toHaveCount(0);

    // Manage tab: same connect gate, no record cards / share buttons.
    await goToManageTab(page);
    await expect(
      page.getByText("Connect wallet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Share access" }),
    ).toHaveCount(0);

    await expect(page).toHaveScreenshot("error-unconnected.png", {
      fullPage: true,
    });
  });

  test("IC-05-02: empty form blocks submit", async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/");
    await connectMockWallet(page);
    await goToInputTab(page);

    // Default category ADDRESS with empty required fields -> disabled submit.
    const submit = page.getByRole("button", {
      name: "Submit on-chain",
      exact: true,
    });
    await expect(submit).toBeDisabled();

    // A forced click on the disabled button does not fire requestTransaction.
    await submit.click({ force: true }).catch(() => {});
    const captured = await getCapturedTxs(page);
    expect(captured).toHaveLength(0);

    await expect(page).toHaveScreenshot("error-empty-form-disabled.png", {
      fullPage: true,
    });
  });

  test("IC-05-03: wallet rejection surfaces failure", async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/");
    await connectMockWallet(page);
    await goToInputTab(page);

    // EMAIL category is the most robust create path (single text field).
    await page.getByRole("tab", { name: "Email", exact: true }).click();
    await page.locator("#email-value").fill("alice@example.com");

    const submit = page.getByRole("button", {
      name: "Submit on-chain",
      exact: true,
    });
    await expect(submit).toBeEnabled();

    // Pre-queue a rejection for the next requestTransaction call.
    await page.evaluate(() => {
      const ctl = (
        window as unknown as { __mockWallet?: { reject(r: string): void } }
      ).__mockWallet;
      if (ctl) ctl.reject("User rejected");
    });

    await submit.click();

    // Failure renders as role="alert" (StatusBadge failure branch) carrying the
    // rejection message; the success branch (role="status" + <code>) must not.
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText("User rejected");
    await expect(page.locator('span[role="status"] code')).toHaveCount(0);

    await expect(page).toHaveScreenshot("error-wallet-reject.png", {
      fullPage: true,
    });
  });
});
