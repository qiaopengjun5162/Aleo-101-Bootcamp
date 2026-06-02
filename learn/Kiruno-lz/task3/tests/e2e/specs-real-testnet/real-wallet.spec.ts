import { test, expect } from "@playwright/test";

/**
 * Real Testnet Integration Tests
 *
 * These tests require a REAL Leo Wallet with testnet credits.
 * Set E2E_REAL_WALLET=true and have the wallet extension unlocked before running.
 * They are SKIPPED by default in CI and in local runs without the env var.
 *
 * Prerequisites:
 *   - Leo Wallet browser extension installed and unlocked
 *   - Wallet has testnet credits (get from https://faucet.aleo.org)
 *   - Frontend dev server running on http://localhost:5173
 *
 * Run:
 *   E2E_REAL_WALLET=true npx playwright test specs-real-testnet/
 */
const REAL_WALLET = process.env.E2E_REAL_WALLET === "true";

test.describe("Real testnet integration", () => {
  test.skip(!REAL_WALLET, "Set E2E_REAL_WALLET=true to run");

  test("RT-01: wallet connects and shows address", async ({ page }) => {
    await page.goto("/");

    // Real wallet adapter will prompt connection via browser extension.
    // User must approve the connection popup manually.
    // After approval, the connected address (aleo1...) should appear in the UI.
    await expect(page.locator("text=aleo1")).toBeVisible({ timeout: 30000 });
  });

  test("RT-02: create_pii submits real transaction", async ({ page }) => {
    await page.goto("/");

    // Step 1: Connect wallet (requires manual popup approval)
    await expect(page.locator("text=aleo1")).toBeVisible({ timeout: 30000 });

    // Step 2: Fill the address form with test data
    const addressInput = page.locator("[data-testid=input-address]");
    if (await addressInput.isVisible()) {
      await addressInput.fill("aleo1test000000000000000000000000000000000000000000000000000000");
    }

    // Step 3: Submit create_pii transaction (requires wallet popup approval)
    const createButton = page.locator("[data-testid=btn-create]");
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    // Step 4: Verify success status appears after transaction confirmation
    // This may take up to 60s depending on network conditions
    await expect(page.locator("[data-testid=status-create]")).toContainText(
      "success",
      { timeout: 60000 }
    );
  });

  test("RT-03: share_pii cross-address flow", async ({ page }) => {
    // TODO: Requires two separate wallet addresses to test cross-address sharing.
    // Steps:
    //   1. Connect as address A, create a PII record
    //   2. Share the record with address B
    //   3. Connect as address B, verify the shared record is visible
    //   4. Consume the shared record
    test.skip(true, "TODO: Implement cross-address share_pii test");
  });

  test("RT-04: consume_shared on-chain", async ({ page }) => {
    // TODO: Requires a pre-shared record from another address.
    // Steps:
    //   1. Connect wallet, navigate to shared records
    //   2. Select a shared record
    //   3. Call consume_shared and verify transaction succeeds
    test.skip(true, "TODO: Implement consume_shared on-chain test");
  });

  test("RT-05: mark_revoked on-chain", async ({ page }) => {
    // TODO: Requires a previously created record to revoke.
    // Steps:
    //   1. Connect wallet, navigate to owned records
    //   2. Select a record and mark it as revoked
    //   3. Verify the on-chain state reflects revocation
    test.skip(true, "TODO: Implement mark_revoked on-chain test");
  });
});
