import { useI18n } from "../../i18n";
import { PURPOSES } from "../../constants/categories";
import { cx } from "../../lib/cx";
import type { SharedRecord } from "../../hooks/useSharedRecords";

type PurposeKey = (typeof PURPOSES)[number]["i18nKey"];

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** Middle-ellipsis an address: aleo1abc…wxyz */
function shortAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 9)}…${addr.slice(-5)}`;
}

export function AuthorizationList({
  records,
  onRevoke,
  revoking,
}: {
  records: SharedRecord[];
  onRevoke: (r: SharedRecord) => void;
  revoking: boolean;
}) {
  const { t } = useI18n();

  const purposeLabel = (code: number | undefined): string => {
    if (code === undefined) return "—";
    const match = PURPOSES.find((p) => p.code === code);
    if (match) {
      return t.share.purposes[match.i18nKey as PurposeKey];
    }
    if (code >= 1000) return `${t.share.purposes.custom} (${code})`;
    return String(code);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t.manage.authorizations}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {records.length}
        </span>
      </div>

      {records.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {t.manage.noAuth}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {records.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
            >
              <div className="min-w-0 flex flex-col gap-0.5">
                <span
                  className="truncate font-mono text-xs text-[var(--text-primary)]"
                  title={r.sender ?? r.id}
                >
                  {r.sender ? shortAddress(r.sender) : shortAddress(r.id)}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {purposeLabel(r.purpose)}
                  {r.expiresAt ? ` · expires at block: ${r.expiresAt}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(r)}
                disabled={revoking}
                className={cx(
                  "inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--danger)]",
                  "transition-colors hover:bg-[var(--danger)]/10",
                  revoking && "cursor-not-allowed opacity-50",
                )}
                aria-label={t.manage.revoke}
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t.manage.revoke}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
