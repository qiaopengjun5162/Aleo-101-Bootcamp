import { test, expect } from "../fixtures/test";
import {
  buildMockPIIRecord,
  injectMockWallet,
  MOCK_USER_ADDRESS,
} from "../fixtures/mock-wallet";
import {
  connectMockWallet,
  getLastCapturedTx,
  goToManageTab,
  seedRecordsAndRefresh,
} from "../fixtures/helpers";

const OWN_RECORD_ID = "record1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SHARED_RECORD_ID =
  "record1ddddddddddddddddddddddddddddddddddddddddddddddd";
const SHARED_NONCE = "987654321field";

/**
 * IC-04: Revoke a shared authorization via `mark_revoked`.
 *
 * Wiring (read from ManagePage.tsx): the page renders one RecordCard per own
 * `PIIRecord`; each card's expanded section embeds an `AuthorizationList` fed
 * by `useSharedRecords` (records whose `recordName === "SharedPIIRecord"`).
 * Clicking a row's "Revoke access" button calls
 * `revoke({ originalNonce: <raw.data.nonce>, proofRecord: { id: shared.id } })`.
 *
 * So the seed needs BOTH: one PIIRecord (renders the card) and one
 * SharedPIIRecord (renders the revoke row). There is no revoke StatusBadge in
 * ManagePage, so success is asserted via the captured transaction.
 *
 * Asserts (per `buildMarkRevokedInputs`): functionName `mark_revoked`, 2 inputs
 *   [0] original nonce `field` literal, [1] SharedPIIRecord id.
 */
test.describe("IC-04: revoke shared PII", () => {
  const sharedRecord: Record<string, unknown> = {
    id: SHARED_RECORD_ID,
    recordName: "SharedPIIRecord",
    spent: false,
    data: {
      owner: MOCK_USER_ADDRESS,
      nonce: SHARED_NONCE,
      sender: MOCK_USER_ADDRESS,
      purpose: "1u128",
      expires_at: "999999u64",
      shared_at: "1000u64",
      payload: {
        category: "2u8",
        label_lo: "0u128",
        label_hi: "0u128",
        data: Array.from({ length: 13 }, () => "0u128"),
        data_len: "0u32",
      },
    },
  };

  const seed = [
    buildMockPIIRecord({ id: OWN_RECORD_ID, category: 2 }),
    sharedRecord,
  ];

  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page, { records: seed });
    await page.goto("/");
    await connectMockWallet(page);
    await goToManageTab(page);
    await seedRecordsAndRefresh(page, seed);
  });

  test("IC-04-01: submit mark_revoked", async ({ page }) => {
    // Expand the own record's card to reveal the AuthorizationList.
    const expandBtn = page.getByRole("button", { name: "Show details" });
    await expect(expandBtn).toBeVisible({ timeout: 10_000 });
    await expandBtn.click();

    const revokeBtn = page.getByRole("button", { name: "Revoke access" });
    await expect(revokeBtn).toBeVisible();

    await expect(page).toHaveScreenshot("revoke-pii-before-click.png", {
      fullPage: true,
    });

    await revokeBtn.click();

    // No status badge for revoke; poll the captured tx.
    await expect
      .poll(
        async () => {
          const tx = await getLastCapturedTx(page);
          return tx?.transitions[0]?.functionName ?? null;
        },
        { timeout: 10_000 },
      )
      .toBe("mark_revoked");

    const tx = await getLastCapturedTx(page);
    const transition = tx!.transitions[0]!;
    expect(transition.functionName).toBe("mark_revoked");
    expect(transition.inputs).toHaveLength(2);
    expect(transition.inputs[0]).toBe(SHARED_NONCE);
    expect(transition.inputs[1]).toBe(SHARED_RECORD_ID);

    await expect(page).toHaveScreenshot("revoke-pii-success.png", {
      fullPage: true,
    });
  });
});
