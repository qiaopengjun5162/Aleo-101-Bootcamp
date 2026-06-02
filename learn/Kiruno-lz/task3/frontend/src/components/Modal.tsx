import { useEffect, type JSX, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element | null {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-[90%] max-w-[480px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 text-[var(--text-primary)]">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
