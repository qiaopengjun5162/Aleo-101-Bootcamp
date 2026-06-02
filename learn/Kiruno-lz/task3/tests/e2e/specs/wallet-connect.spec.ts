import { test, expect } from "../fixtures/test";
import { injectMockWallet } from "../fixtures/mock-wallet";
import { connectMockWallet } from "../fixtures/helpers";

/**
 * IC-01: Connect wallet.
 *
 * New UI: the wallet control lives in the header (`WalletStatus`). Disconnected
 * it renders `WalletMultiButton` ("Select Wallet"); connected it renders a
 * truncated-address chip + a "Disconnect" button.
 */
test.describe("IC-01: connect wallet", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/");
  });

  test("IC-01-01: shows Select Wallet before connect", async ({ page }) => {
    await expect(page).toHaveTitle(/Aleo PII Protocol/);
    await expect(
      page.getByRole("button", { name: /select wallet/i }),
    ).toBeVisible();
    // No connected chip yet.
    await expect(
      page.getByRole("button", { name: /disconnect/i }),
    ).toHaveCount(0);
    await expect(page).toHaveScreenshot("wallet-disconnected.png", {
      fullPage: true,
    });
  });

  test("IC-01-02: Select Wallet → Leo Wallet connects", async ({ page }) => {
    await connectMockWallet(page);

    // Header now shows the truncated address chip (aleo1u…usr0) and disconnect.
    await expect(
      page.getByRole("button", { name: /disconnect/i }),
    ).toBeVisible();
    await expect(page.locator("code.font-mono").first()).toBeVisible();

    await expect(page).toHaveURL(/localhost:5173/);
    await expect(page).toHaveTitle(/Aleo PII Protocol/);

    await expect(page).toHaveScreenshot("wallet-connected.png", {
      fullPage: true,
    });
  });
});
