import { test, expect } from "../fixtures/test";
import {
  buildMockPIIRecord,
  injectMockWallet,
  MOCK_RECIPIENT_ADDRESS,
} from "../fixtures/mock-wallet";
import {
  connectMockWallet,
  getLastCapturedTx,
  goToManageTab,
  seedRecordsAndRefresh,
} from "../fixtures/helpers";

const RECORD_ID = "record1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/**
 * IC-03: Share PII via the Manage tab's per-card ShareDialog.
 *
 * Flow: seed one PIIRecord → Manage tab → refresh → click the card "Share
 * access" button → fill recipient + expiry + purpose in the modal → confirm.
 *
 * The dialog calls `close()` on success (unmounting the StatusBadge), so the
 * authoritative signal is the captured `share_pii` transaction.
 *
 * Asserts (per `buildSharePIIInputs`): functionName `share_pii`, 6 inputs:
 *   [0] source record id, [1] recipient, [2] expiresAt u64, [3] purpose u128,
 *   [4] newNonce field, [5] sharedAt u64.
 */
test.describe("IC-03: share PII", () => {
  test.beforeEach(async ({ page }) => {
    // EMAIL category (2) so the card renders without address decoding.
    const seed = buildMockPIIRecord({ id: RECORD_ID, category: 2 });
    await injectMockWallet(page, { records: [seed] });
    await page.goto("/");
    await connectMockWallet(page);
    await goToManageTab(page);
    await seedRecordsAndRefresh(page, [seed]);
  });

  test("IC-03-01: submit share_pii with 6 inputs", async ({ page }) => {
    // The seeded card's share button (aria-label / text "Share access").
    const shareButton = page.getByRole("button", { name: "Share access" });
    await expect(shareButton).toBeVisible({ timeout: 10_000 });
    await shareButton.click();

    // Modal (role=dialog) is open.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("#share-recipient").fill(MOCK_RECIPIENT_ADDRESS);
    await dialog.locator("#share-expiry").fill("100");
    // Pick a non-default purpose: Verification (code 2).
    await dialog.locator("#share-purpose").selectOption({ label: "Verification" });

    await expect(page).toHaveScreenshot("share-pii-form-filled.png", {
      fullPage: true,
    });

    const confirm = page.getByRole("button", { name: "Confirm authorization" });
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // Success closes the dialog; wait for it to detach.
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const tx = await getLastCapturedTx(page);
    expect(tx).not.toBeNull();
    const transition = tx!.transitions[0]!;
    expect(transition.functionName).toBe("share_pii");
    expect(transition.inputs).toHaveLength(6);

    const [source, recipient, expiresAt, purpose, newNonce, sharedAt] =
      transition.inputs;
    expect(source).toBe(RECORD_ID);
    expect(recipient).toBe(MOCK_RECIPIENT_ADDRESS);
    expect(expiresAt).toMatch(/u64$/);
    expect(purpose).toBe("2u128");
    expect(newNonce).toMatch(/field$/);
    expect(sharedAt).toMatch(/u64$/);

    await expect(page).toHaveScreenshot("share-pii-success.png", {
      fullPage: true,
    });
  });
});
