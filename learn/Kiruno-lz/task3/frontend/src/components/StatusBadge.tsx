import type { JSX } from "react";
import type { PIIOpState } from "../hooks/usePIIStatus";
import { cx } from "../lib/cx";

function truncateTx(txId: string): string {
  if (txId.length <= 14) return txId;
  return `${txId.slice(0, 8)}…${txId.slice(-4)}`;
}

const SHELL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium border-[var(--border)] bg-[var(--bg-secondary)]";

export function StatusBadge({
  state,
  label,
}: {
  state: PIIOpState;
  label?: string;
}): JSX.Element | null {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "pending") {
    return (
      <span className={cx(SHELL, "text-[var(--warning)]")} role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--warning)]" />
        {label ?? "Pending"}
      </span>
    );
  }

  if (state.status === "success") {
    return (
      <span className={cx(SHELL, "text-[var(--success)]")} role="status">
        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
        {label ?? "Success"}
        {state.txId ? (
          <code className="font-mono text-[var(--text-secondary)]">
            {truncateTx(state.txId)}
          </code>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cx(SHELL, "text-[var(--danger)]")} role="alert">
      <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
      {label ?? "Failed"}
      {state.error ? (
        <span className="text-[var(--text-secondary)]">{state.error}</span>
      ) : null}
    </span>
  );
}
