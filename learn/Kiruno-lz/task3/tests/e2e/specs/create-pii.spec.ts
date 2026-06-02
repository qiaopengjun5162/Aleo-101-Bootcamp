import { test, expect } from "../fixtures/test";
import { injectMockWallet } from "../fixtures/mock-wallet";
import {
  connectMockWallet,
  getLastCapturedTx,
  goToInputTab,
} from "../fixtures/helpers";

/**
 * IC-02: Create PII via the Input tab.
 *
 * Uses the EMAIL category (single text field) as the most robust path. The
 * default category is ADDRESS, so the submit button starts disabled; switching
 * to EMAIL and entering a valid address enables it.
 *
 * Asserts:
 *   - `requestTransaction` captured once, functionName `create_pii`, 4 inputs
 *     (payload struct, nonce `field`, version `u8`, createdAt `u64`) per
 *     `buildCreatePIIInputs`.
 *   - Success status badge shows a tx id. NOTE: `StatusBadge.truncateTx` slices
 *     the id to its first 8 chars + "…" + last 4, so the visible prefix is
 *     "at1mockt" (the mock's "at1mocktx" prefix is cut at 8 chars).
 */
test.describe("IC-02: create PII", () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/");
    await connectMockWallet(page);
    await goToInputTab(page);
  });

  test("IC-02-01: submit create_pii (EMAIL category)", async ({ page }) => {
    const submit = page.getByRole("button", {
      name: "Submit on-chain",
      exact: true,
    });

    // Default category is ADDRESS with empty required fields -> disabled.
    await expect(submit).toBeDisabled();

    // Switch to the EMAIL category pill (role=tab, i18n "Email").
    await page.getByRole("tab", { name: "Email", exact: true }).click();

    // Fill the single email field (label "Email" → #email-value).
    await page.locator("#email-value").fill("alice@example.com");

    await expect(submit).toBeEnabled();
    await expect(page).toHaveScreenshot("create-pii-form-filled.png", {
      fullPage: true,
    });

    await submit.click();

    // Only the success badge renders a <code> (the tx id). Waiting for it
    // confirms the success branch (pending has no code).
    const successCode = page.locator('span[role="status"] code');
    await expect(successCode).toBeVisible({ timeout: 15_000 });
    await expect(successCode).toContainText("at1mockt");

    const tx = await getLastCapturedTx(page);
    expect(tx).not.toBeNull();
    expect(tx!.chainId).toBe("testnetbeta");
    expect(tx!.feePrivate).toBe(false);
    expect(tx!.transitions).toHaveLength(1);

    const transition = tx!.transitions[0]!;
    expect(transition.program).toBe("pii_protocol_v1.aleo");
    expect(transition.functionName).toBe("create_pii");
    expect(transition.inputs).toHaveLength(4);

    expect(transition.inputs[0]).toContain("category: 2u8"); // EMAIL = 2
    expect(transition.inputs[1]).toMatch(/field$/); // nonce
    expect(transition.inputs[2]).toMatch(/u8$/); // version
    expect(transition.inputs[3]).toMatch(/u64$/); // createdAt

    await expect(page).toHaveScreenshot("create-pii-success.png", {
      fullPage: true,
    });
  });
});
