import { useI18n } from "../../i18n";
import { PHONE_PREFIXES } from "../../i18n/geo";
import type { FormCategory, PIIFormFields } from "./usePIIForm";

const FIELD_CLASS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
const LABEL_CLASS =
  "mb-1 block text-xs font-medium text-[var(--text-secondary)]";

type GenericCategory = Exclude<FormCategory, "ADDRESS">;

export interface GenericFieldsProps {
  category: GenericCategory;
  fields: PIIFormFields;
  setField: <G extends keyof PIIFormFields, K extends keyof PIIFormFields[G]>(
    group: G,
    key: K,
    value: PIIFormFields[G][K],
  ) => void;
}

export function GenericFields({
  category,
  fields,
  setField,
}: GenericFieldsProps) {
  const { t } = useI18n();
  const a = t.input.address;

  if (category === "PHONE") {
    return (
      <div className="grid grid-cols-[7rem_1fr] gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="phone-prefix">
            {a.phonePrefix}
          </label>
          <select
            id="phone-prefix"
            className={FIELD_CLASS}
            value={fields.phone.phonePrefix}
            onChange={(e) => setField("phone", "phonePrefix", e.target.value)}
          >
            <option value="">—</option>
            {PHONE_PREFIXES.map((p) => (
              <option key={`${p.country}${p.code}`} value={p.code}>
                {p.code} ({p.country})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="phone-number">
            {t.input.categories.phone}
          </label>
          <input
            id="phone-number"
            inputMode="tel"
            className={FIELD_CLASS}
            value={fields.phone.phone}
            onChange={(e) => setField("phone", "phone", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (category === "EMAIL") {
    return (
      <div>
        <label className={LABEL_CLASS} htmlFor="email-value">
          {t.input.categories.email}
        </label>
        <input
          id="email-value"
          inputMode="email"
          className={FIELD_CLASS}
          value={fields.email.email}
          onChange={(e) => setField("email", "email", e.target.value)}
        />
      </div>
    );
  }

  // CUSTOM
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={LABEL_CLASS} htmlFor="custom-label">
          {t.input.category}
        </label>
        <input
          id="custom-label"
          maxLength={32}
          className={FIELD_CLASS}
          value={fields.custom.label}
          onChange={(e) => setField("custom", "label", e.target.value)}
        />
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor="custom-data">
          {t.input.categories.custom}
        </label>
        <textarea
          id="custom-data"
          rows={4}
          className={FIELD_CLASS}
          value={fields.custom.data}
          onChange={(e) => setField("custom", "data", e.target.value)}
        />
      </div>
    </div>
  );
}
