import type { Page } from "@playwright/test";

/**
 * Mock Leo Wallet injection for Playwright L3 tests.
 *
 * Strategy: The real `LeoWalletAdapter` from `@demox-labs/aleo-wallet-adapter-leo`
 * detects the extension by polling `window.leoWallet || window.leo` (see
 * `frontend/node_modules/@demox-labs/aleo-wallet-adapter-leo/dist/adapter.js`).
 * On detection it calls `wallet.isAvailable()`, then on `connect()` invokes
 * `wallet.connect(decryptPermission, network, programs)` and reads `wallet.publicKey`.
 * Transactions / record queries go through `wallet.requestTransaction(tx)` and
 * `wallet.requestRecordPlaintexts(programId)` respectively. We satisfy the same
 * shape so the React adapter chain operates end-to-end without any browser
 * extension installed.
 *
 * `page.addInitScript` runs BEFORE any page script, so the adapter's first
 * synchronous detection (`Strategy #4` in `scopePollingDetectionStrategy`)
 * already sees the mock and immediately reports `WalletReadyState.Installed`.
 *
 * The mock also exposes hooks (`__mockWallet`) so tests can inspect captured
 * transactions, queue rejections, or seed mock records.
 */

export const MOCK_USER_ADDRESS =
  "aleo1usrmockmockmockmockmockmockmockmockmockmockmockmockmockusr0";
export const MOCK_RECIPIENT_ADDRESS =
  "aleo1rcvmockmockmockmockmockmockmockmockmockmockmockmockmockrcv0";
export const MOCK_PROGRAM_ID = "pii_protocol_v1.aleo";

export interface MockWalletOptions {
  address?: string;
  txIdPrefix?: string;
  /**
   * Pre-seeded records returned by `requestRecordPlaintexts`. Each entry is a
   * record object loosely matching the shape that
   * `frontend/src/hooks/useMyPIIRecords.ts` maps. Use the
   * `buildMockPIIRecord` helper from this file.
   */
  records?: Array<Record<string, unknown>>;
}

export interface CapturedTransaction {
  // Mirrors `frontend/node_modules/@demox-labs/aleo-wallet-adapter-base/dist/transaction.js`
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

export interface MockWalletControl {
  transactions: CapturedTransaction[];
  records: Array<Record<string, unknown>>;
  setRecords(records: Array<Record<string, unknown>>): void;
  reject(reason: string): void;
  clear(): void;
}

declare global {
  interface Window {
    leoWallet?: unknown;
    leo?: unknown;
    __mockWallet?: MockWalletControl;
  }
}

export async function injectMockWallet(
  page: Page,
  options: MockWalletOptions = {},
): Promise<void> {
  const address = options.address ?? MOCK_USER_ADDRESS;
  const txIdPrefix = options.txIdPrefix ?? "at1mocktx";
  const seedRecords = options.records ?? [];

  await page.addInitScript(
    (params: {
      address: string;
      txIdPrefix: string;
      seedRecords: Array<Record<string, unknown>>;
    }) => {
      const { address, txIdPrefix, seedRecords } = params;
      type Tx = {
        address: string;
        chainId: string;
        fee: number;
        feePrivate: boolean;
        transitions: Array<{
          program: string;
          functionName: string;
          inputs: string[];
        }>;
      };

      const state = {
        transactions: [] as Tx[],
        records: seedRecords.slice(),
        nextRejectReason: null as string | null,
      };

      const wallet = {
        publicKey: address,
        isAvailable: async () => true,
        connect: async () => {
          // Real Leo wallet returns void here; the adapter reads `wallet.publicKey`.
          return undefined;
        },
        disconnect: async () => undefined,
        requestTransaction: async (tx: Tx) => {
          if (state.nextRejectReason) {
            const reason = state.nextRejectReason;
            state.nextRejectReason = null;
            throw new Error(reason);
          }
          const snapshot: Tx = JSON.parse(JSON.stringify(tx));
          state.transactions.push(snapshot);
          const id =
            txIdPrefix +
            Date.now().toString(16) +
            Math.floor(Math.random() * 1e6).toString(16);
          return { transactionId: id };
        },
        requestExecution: async (tx: Tx) => {
          const snapshot: Tx = JSON.parse(JSON.stringify(tx));
          state.transactions.push(snapshot);
          return { transactionId: txIdPrefix + "exec" + Date.now().toString(16) };
        },
        requestRecordPlaintexts: async () => {
          return { records: state.records };
        },
        requestRecords: async () => ({ records: state.records }),
        requestTransactionHistory: async () => ({ transactions: [] }),
        requestBulkTransactions: async () => ({ transactionIds: [] }),
        requestDeploy: async () => ({ transactionId: "" }),
        transactionStatus: async () => ({ status: "Completed" }),
        transitionViewKeys: async () => ({ viewKeys: [] }),
        getExecution: async () => ({ execution: "" }),
        decrypt: async () => ({ text: "" }),
        signMessage: async () => ({ signature: new Uint8Array() }),
      };

      Object.defineProperty(window, "leoWallet", {
        value: wallet,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "leo", {
        value: wallet,
        writable: true,
        configurable: true,
      });

      const control = {
        get transactions() {
          return state.transactions;
        },
        get records() {
          return state.records;
        },
        setRecords(records: Array<Record<string, unknown>>) {
          state.records = records;
        },
        reject(reason: string) {
          state.nextRejectReason = reason;
        },
        clear() {
          state.transactions.length = 0;
        },
      };

      Object.defineProperty(window, "__mockWallet", {
        value: control,
        writable: false,
        configurable: true,
      });
    },
    { address, txIdPrefix, seedRecords },
  );
}

/**
 * Build a synthetic PIIRecord matching what `useMyPIIRecords.ts` expects after
 * mapping. The hook reads `r.id`, `r.recordName`, `r.spent`, and tries to
 * decode `r.data` via `decodePIIPayload`. We pre-seed a `decoded`-shaped
 * payload but also include valid raw fields so the codec succeeds-or-falls-back
 * gracefully (decoding failure returns `null`, which the page still renders).
 */
export function buildMockPIIRecord(opts: {
  id?: string;
  category?: number;
  label?: string;
  data?: string;
  spent?: boolean;
  nonce?: string;
}): Record<string, unknown> {
  return {
    id: opts.id ?? "record1mockmockmockmockmockmockmockmockmockmockmock",
    recordName: "PIIRecord",
    spent: opts.spent ?? false,
    data: {
      owner: MOCK_USER_ADDRESS,
      nonce: opts.nonce ?? "123field",
      payload: {
        category: `${opts.category ?? 1}u8`,
        label_lo: "0u128",
        label_hi: "0u128",
        data: Array.from({ length: 13 }, () => "0u128"),
        data_len: "0u32",
      },
    },
  };
}
