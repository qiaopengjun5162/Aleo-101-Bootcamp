import { test, expect } from "../fixtures/test";
import {
  buildMockPIIRecord,
  injectMockWallet,
  MOCK_USER_ADDRESS,
} from "../fixtures/mock-wallet";
import {
  connectMockWallet,
  getCapturedTxs,
  goToManageTab,
  seedRecordsAndRefresh,
} from "../fixtures/helpers";

const OWN_RECORD_ID = "record1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const SHARED_RECORD_ID =
  "record1sharedmockmockmockmockmockmockmockmockmockmockmockshd0";

/**
 * IC-06: consume-after-read — SCOPE CHANGE for the refactored UI.
 *
 * The OLD FoodDelivery page never rendered a `consume_shared` surface; the old
 * spec reached into `window.leoWallet` directly to simulate the receiver SDK.
 * The NEW tab-based console (App.tsx → InputPage / ManagePage) is purely the
 * OWNER side: create / share / revoke. There is no receiver "consume" action,
 * and `useConsumeShared` is not wired into any page.
 *
 * Rather than assert a falsely-driven raw wallet call (which tests the mock,
 * not the app), this spec is reframed to verify the closest real new-UI
 * behavior: shared authorizations the owner granted are READABLE and rendered
 * in the Manage tab's AuthorizationList (the data a receiver/consume flow would
 * act on). It also confirms that merely viewing shared records captures NO
 * transaction (read-only path).
 *
 * The on-chain `consume_shared` transition is exercised at L1/L2
 * (`buildConsumeSharedInputs`); surfacing it in the UI is out of MVP manage
 * scope, so the burn-side assertion is intentionally omitted here.
 */
test.describe("IC-06: shared-record visibility (consume scope)", () => {
  const sharedRecord: Record<string, unknown> = {
    id: SHARED_RECORD_ID,
    recordName: "SharedPIIRecord",
    spent: false,
    data: {
      owner: MOCK_USER_ADDRESS,
      nonce: "111field",
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

  test("IC-06-01: shared authorization is readable, no tx on read", async ({
    page,
  }) => {
    await injectMockWallet(page, { records: seed });
    await page.goto("/");
    await connectMockWallet(page);
    await goToManageTab(page);
    await seedRecordsAndRefresh(page, seed);

    // Expand the owner's card to reveal the AuthorizationList.
    const expandBtn = page.getByRole("button", { name: "Show details" });
    await expect(expandBtn).toBeVisible({ timeout: 10_000 });
    await expandBtn.click();

    // The shared authorization row is rendered (purpose label "Delivery" = 1).
    await expect(page.getByText("Authorizations")).toBeVisible();
    await expect(page.getByText("Delivery", { exact: false })).toBeVisible();

    // Reading shared records is a query-only path: no transaction captured.
    const txs = await getCapturedTxs(page);
    expect(txs).toHaveLength(0);

    await expect(page).toHaveScreenshot("consume-shared-success.png", {
      fullPage: true,
    });
  });
});
