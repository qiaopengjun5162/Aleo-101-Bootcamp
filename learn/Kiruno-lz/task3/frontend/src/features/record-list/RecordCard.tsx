import { useState, type ReactNode } from "react";
import { CategoryBadge } from "../../components/CategoryBadge";
import { useI18n } from "../../i18n";
import { decodeAddress } from "../../lib/address";
import { cx } from "../../lib/cx";
import type { MyPIIRecord } from "../../hooks/useMyPIIRecords";

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Safely read a string-ish field from `raw.data`. */
function rawDataField(
  raw: Record<string, unknown>,
  key: string,
): string | undefined {
  const data = raw.data;
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return undefined;
}

/** Truncate a string to maxLen, appending an ellipsis when cut. */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…`;
}

/** Middle-ellipsis a record id: aleo1abc…wxyz */
function middleEllipsis(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 9)}…${value.slice(-5)}`;
}

export function RecordCard({
  record,
  onShareClick,
  children,
}: {
  record: MyPIIRecord;
  onShareClick: (r: MyPIIRecord) => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const category = record.decoded?.category ?? 3;
  const label = record.decoded?.label ?? "";
  const data = record.decoded?.data ?? "";
  const isAddress = category === 0;
  const addressFields = isAddress ? decodeAddress(data) : null;

  const createdAt = rawDataField(record.raw, "created_at");
  const version = rawDataField(record.raw, "version");

  return (
    <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CategoryBadge category={category} />
          {label ? (
            <span className="truncate text-sm font-medium text-[var(--text-primary)]">
              {label}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onShareClick(record)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--bg-primary)]"
          aria-label={t.manage.share}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t.manage.share}
        </button>
      </div>

      <div className="mt-3 text-sm text-[var(--text-primary)]">
        {addressFields ? (
          <div className="flex flex-col gap-0.5 text-xs text-[var(--text-secondary)]">
            <span>
              {[
                addressFields.country,
                addressFields.province,
                addressFields.city,
              ]
                .filter(Boolean)
                .join(" / ")}
            </span>
            {addressFields.street ? <span>{addressFields.street}</span> : null}
            <span>
              {[addressFields.lastName, addressFields.firstName]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        ) : (
          <p className="break-words text-xs text-[var(--text-secondary)]">
            {truncate(data, 80)}
          </p>
        )}
      </div>

      <p
        className="mt-2 font-mono text-[11px] text-[var(--text-secondary)]"
        title={record.id}
      >
        {middleEllipsis(record.id)}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs text-[var(--accent)]"
        aria-expanded={expanded}
      >
        <ChevronDownIcon
          className={cx(
            "h-3.5 w-3.5 transition-transform",
            expanded && "rotate-180",
          )}
        />
        {t.manage.expand}
      </button>

      {expanded ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <dl className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-secondary)]">data</dt>
              <dd className="break-all text-right text-[var(--text-primary)]">
                {data || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-secondary)]">created at block</dt>
              <dd className="text-[var(--text-primary)]">{createdAt ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-secondary)]">version</dt>
              <dd className="text-[var(--text-primary)]">{version ?? "—"}</dd>
            </div>
          </dl>
          {children}
        </div>
      ) : null}
    </div>
  );
}
