import { useI18n } from "../../i18n";
import { cx } from "../../lib/cx";
import {
  PII_CATEGORIES,
  type PIICategoryKey,
} from "../../constants/categories";
import type { FormCategory } from "./usePIIForm";

const KYC_TOOLTIP =
  "KYC verification is handled by dedicated protocols like zPass";

const ORDER: PIICategoryKey[] = ["ADDRESS", "PHONE", "EMAIL", "CUSTOM", "KYC"];

export function CategorySelector({
  value,
  onChange,
}: {
  value: FormCategory;
  onChange: (c: FormCategory) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label={t.input.category}
    >
      {ORDER.map((key) => {
        const cat = PII_CATEGORIES[key];
        const label = t.input.categories[cat.i18nKey];
        const disabled = "disabled" in cat && cat.disabled === true;
        const selected = !disabled && value === (key as FormCategory);

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled}
            disabled={disabled}
            title={disabled ? KYC_TOOLTIP : undefined}
            onClick={
              disabled ? undefined : () => onChange(key as FormCategory)
            }
            className={cx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              selected &&
                "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]",
              !selected &&
                !disabled &&
                "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              disabled &&
                "cursor-not-allowed border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] opacity-50",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
