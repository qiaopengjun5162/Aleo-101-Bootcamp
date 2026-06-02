import { useEffect, useState, type JSX } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useI18n } from "../i18n";
import { useMyPIIRecords } from "../hooks/useMyPIIRecords";
import { useSharedRecords, type SharedRecord } from "../hooks/useSharedRecords";
import { useRevoke } from "../hooks/useRevoke";
import { RecordCard } from "../features/record-list/RecordCard";
import { AuthorizationList } from "../features/record-list/AuthorizationList";
import { ShareDialog } from "../features/record-list/ShareDialog";
import type { MyPIIRecord } from "../hooks/useMyPIIRecords";

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/** Read the original nonce literal from a record's raw data. */
function recordNonce(record: { raw: Record<string, unknown> }): string {
  const data = record.raw.data;
  if (data && typeof data === "object") {
    const nonce = (data as Record<string, unknown>).nonce;
    if (typeof nonce === "string" && nonce.length > 0) return nonce;
  }
  return "0field";
}

export function ManagePage(): JSX.Element {
  const { t } = useI18n();
  const { connected, publicKey } = useWallet();
  const {
    records,
    loading: recordsLoading,
    refresh: refreshRecords,
  } = useMyPIIRecords();
  const { sharedRecords, refresh: refreshShared } = useSharedRecords();
  const { revoke, state: revokeState } = useRevoke();

  const [shareTarget, setShareTarget] = useState<MyPIIRecord | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      void refreshRecords();
      void refreshShared();
    }
  }, [connected, publicKey, refreshRecords, refreshShared]);

  const refreshAll = () => {
    void refreshRecords();
    void refreshShared();
  };

  const ownRecords = records.filter(
    (r) => r.recordName === "PIIRecord" && !r.spent,
  );

  const handleRevoke = async (shared: SharedRecord) => {
    try {
      await revoke({
        originalNonce: recordNonce(shared),
        proofRecord: { id: shared.id },
      });
      refreshAll();
    } catch {
      // failure surfaced via revoke state
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {t.manage.title}
        </h1>
        <button
          type="button"
          onClick={refreshAll}
          disabled={!connected || recordsLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon className="h-4 w-4" />
          {t.manage.refresh}
        </button>
      </div>

      {!connected ? (
        <p className="mt-12 text-center text-sm text-[var(--text-secondary)]">
          {t.wallet.connect}
        </p>
      ) : ownRecords.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[var(--text-secondary)]">
          {t.manage.empty}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onShareClick={setShareTarget}
            >
              <AuthorizationList
                records={sharedRecords}
                onRevoke={handleRevoke}
                revoking={revokeState.status === "pending"}
              />
            </RecordCard>
          ))}
        </div>
      )}

      <ShareDialog
        open={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        record={shareTarget}
        onShared={refreshAll}
      />
    </section>
  );
}
