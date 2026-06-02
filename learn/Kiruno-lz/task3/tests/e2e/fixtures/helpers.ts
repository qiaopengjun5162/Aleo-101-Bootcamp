import { expect, type Page } from "@playwright/test";

/**
 * Shape of a transaction captured by the mock wallet (`__mockWallet`). Mirrors
 * `CapturedTransaction` in `mock-wallet.ts` but kept local so specs can assert
 * against a concrete type without importing the control interface.
 */
export interface CapturedTx {
  address: string;
  chainId: string;
  fee: number;
  feePrivate: boolean;
  transitions: Array<{
    program: string;
    functionName: string;
    inputs: string[];
  }>;
}

/**
 * Open the `WalletMultiButton` modal, pick "Leo Wallet", and wait for the
 * adapter to surface the connected state in the new tab-based PII console.
 *
 * Flow (unchanged adapter ceremony):
 *   1. Click "Select Wallet" in the header (rendered by
 *      `@demox-labs/aleo-wallet-adapter-reactui`).
 *   2. The modal lists installed wallets — our mock injects `window.leoWallet`
 *      so the adapter reports `WalletReadyState.Installed` and "Leo Wallet" is
 *      selectable.
 *   3. Click the "Leo Wallet" entry — fires `select('Leo Wallet')` →
 *      `adapter.connect(...)` → reads `window.leoWallet.publicKey`.
 *
 * Connection success is asserted by a NEW-UI signal: `WalletStatus` swaps the
 * "Select Wallet" button for a truncated-address chip with a "Disconnect"
 * button (i18n `t.wallet.disconnect`).
 */
export async function connectMockWallet(page: Page): Promise<void> {
  await page.getByRole("button", { name: /select wallet/i }).click();
  await page
    .getByRole("button", { name: /leo wallet/i })
    .first()
    .click();

  // "Select Wallet" disappears and the disconnect control appears.
  await expect(
    page.getByRole("button", { name: /select wallet/i }),
  ).toHaveCount(0, { timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: /disconnect/i }),
  ).toBeVisible({ timeout: 10_000 });
}

/** Click the header "Input" pill (i18n `t.header.input`, English default). */
export async function goToInputTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Input", exact: true }).click();
}

/** Click the header "Manage" pill (i18n `t.header.manage`, English default). */
export async function goToManageTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Manage", exact: true }).click();
}

/** Latest tx captured by the mock wallet, or null if none. */
export async function getLastCapturedTx(page: Page): Promise<CapturedTx | null> {
  return page.evaluate(() => {
    const ctl = (
      window as unknown as { __mockWallet?: { transactions: unknown[] } }
    ).__mockWallet;
    if (!ctl) return null;
    const txs = ctl.transactions;
    return txs.length === 0 ? null : (txs[txs.length - 1] as never);
  });
}

/** All txs captured by the mock wallet. */
export async function getCapturedTxs(page: Page): Promise<CapturedTx[]> {
  return page.evaluate(() => {
    const ctl = (
      window as unknown as { __mockWallet?: { transactions: unknown[] } }
    ).__mockWallet;
    return ctl ? (ctl.transactions as never[]) : [];
  });
}

/** Push records into the mock wallet without touching the UI. */
export async function setMockRecords(
  page: Page,
  records: Array<Record<string, unknown>>,
): Promise<void> {
  await page.evaluate((recs) => {
    const ctl = (
      window as unknown as { __mockWallet?: { setRecords(r: unknown[]): void } }
    ).__mockWallet;
    if (ctl) ctl.setRecords(recs);
  }, records);
}

/** Queue a rejection for the next `requestTransaction` call. */
export async function queueReject(page: Page, reason: string): Promise<void> {
  await page.evaluate((r) => {
    const ctl = (
      window as unknown as { __mockWallet?: { reject(reason: string): void } }
    ).__mockWallet;
    if (ctl) ctl.reject(r);
  }, reason);
}

/**
 * Seed records into the mock wallet, then click the Manage page refresh button
 * (i18n `t.manage.refresh` = "Refresh") so the grid re-reads them.
 *
 * Precondition: caller is already on the Manage tab and connected.
 */
export async function seedRecordsAndRefresh(
  page: Page,
  records: Array<Record<string, unknown>>,
): Promise<void> {
  await setMockRecords(page, records);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
}
