import { useCallback } from "react";
import type { JSX } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useI18n } from "../i18n";
import { cx } from "../lib/cx";
import { useCreatePII } from "../hooks/useCreatePII";
import { StatusBadge } from "../components/StatusBadge";
import { CategorySelector } from "../features/pii-form/CategorySelector";
import { AddressFields } from "../features/pii-form/AddressFields";
import { GenericFields } from "../features/pii-form/GenericFields";
import { usePIIForm } from "../features/pii-form/usePIIForm";
import type { AddressFields as AddressFieldValues } from "../lib/address";

export function InputPage(): JSX.Element {
  const { t } = useI18n();
  const { connected } = useWallet();
  const { category, setCategory, fields, setField, result, reset } =
    usePIIForm();
  const { create, state, reset: resetStatus } = useCreatePII();

  const setAddressField = useCallback(
    <K extends keyof AddressFieldValues>(
      key: K,
      value: AddressFieldValues[K],
    ) => setField("address", key, value),
    [setField],
  );

  const pending = state.status === "pending";

  const handleSubmit = useCallback(async () => {
    if (!result.valid || !result.payload || pending) return;
    try {
      await create({ payload: result.payload });
      reset();
    } catch {
      // Failure surfaced via <StatusBadge state={state} />; keep input intact.
    }
  }, [result, pending, create, reset]);

  const handleCategoryChange = useCallback(
    (next: typeof category) => {
      setCategory(next);
      resetStatus();
    },
    [setCategory, resetStatus],
  );

  if (!connected) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-[70%] max-w-3xl flex-col items-center justify-center gap-4 py-10 text-center">
        <p className="text-base text-[var(--text-secondary)]">
          {t.wallet.connect}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[80vh] w-[70%] max-w-3xl py-10">
      <div className="mb-6">
        <span className="mb-3 block text-sm font-medium text-[var(--text-secondary)]">
          {t.input.category}
        </span>
        <CategorySelector value={category} onChange={handleCategoryChange} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        {category === "ADDRESS" ? (
          <AddressFields fields={fields.address} setField={setAddressField} />
        ) : (
          <GenericFields
            category={category}
            fields={fields}
            setField={setField}
          />
        )}
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3">
        <button
          type="button"
          disabled={!result.valid || pending}
          onClick={handleSubmit}
          className={cx(
            "rounded-xl px-5 py-3 text-sm font-semibold text-[var(--bg-primary)] transition-opacity",
            "bg-[var(--accent)]",
            (!result.valid || pending) && "cursor-not-allowed opacity-50",
          )}
        >
          {pending ? t.input.submitting : t.input.submit}
        </button>
        <StatusBadge state={state} label={t.input.submit} />
      </div>
    </div>
  );
}
