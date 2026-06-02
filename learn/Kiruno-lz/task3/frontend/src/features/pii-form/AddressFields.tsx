import { useI18n } from "../../i18n";
import { COUNTRIES, PROVINCES, PHONE_PREFIXES } from "../../i18n/geo";
import type { AddressFields as AddressFieldValues } from "../../lib/address";

const FIELD_CLASS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
const LABEL_CLASS =
  "mb-1 block text-xs font-medium text-[var(--text-secondary)]";

export function AddressFields({
  fields,
  setField,
}: {
  fields: AddressFieldValues;
  setField: <K extends keyof AddressFieldValues>(
    key: K,
    value: AddressFieldValues[K],
  ) => void;
}) {
  const { t, lang } = useI18n();
  const a = t.input.address;
  const provinces = PROVINCES[fields.country] ?? [];
  const hasProvinceList = provinces.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: country + province */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="addr-country">
            {a.country}
          </label>
          <select
            id="addr-country"
            className={FIELD_CLASS}
            value={fields.country}
            onChange={(e) => {
              setField("country", e.target.value);
              setField("province", "");
            }}
          >
            <option value="">—</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {lang === "zh" ? c.name_zh : c.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="addr-province">
            {a.province}
          </label>
          {hasProvinceList ? (
            <select
              id="addr-province"
              className={FIELD_CLASS}
              value={fields.province}
              onChange={(e) => setField("province", e.target.value)}
            >
              <option value="">—</option>
              {provinces.map((p) => {
                const name = lang === "zh" ? p.name_zh : p.name_en;
                return (
                  <option key={p.name_en} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              id="addr-province"
              className={FIELD_CLASS}
              value={fields.province}
              onChange={(e) => setField("province", e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Row 2: city */}
      <div>
        <label className={LABEL_CLASS} htmlFor="addr-city">
          {a.city}
        </label>
        <input
          id="addr-city"
          className={FIELD_CLASS}
          value={fields.city}
          onChange={(e) => setField("city", e.target.value)}
        />
      </div>

      {/* Street (required, part of §6.3 ordering) */}
      <div>
        <label className={LABEL_CLASS} htmlFor="addr-street">
          {a.street}
        </label>
        <input
          id="addr-street"
          className={FIELD_CLASS}
          value={fields.street}
          onChange={(e) => setField("street", e.target.value)}
        />
      </div>

      {/* Row 3: lastName + firstName */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="addr-lastName">
            {a.lastName}
          </label>
          <input
            id="addr-lastName"
            className={FIELD_CLASS}
            value={fields.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="addr-firstName">
            {a.firstName}
          </label>
          <input
            id="addr-firstName"
            className={FIELD_CLASS}
            value={fields.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
          />
        </div>
      </div>

      {/* Row 4: phonePrefix + phone (optional) */}
      <div className="grid grid-cols-[7rem_1fr] gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="addr-phonePrefix">
            {a.phonePrefix}
          </label>
          <select
            id="addr-phonePrefix"
            className={FIELD_CLASS}
            value={fields.phonePrefix}
            onChange={(e) => setField("phonePrefix", e.target.value)}
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
          <label className={LABEL_CLASS} htmlFor="addr-phone">
            {a.phone}
          </label>
          <input
            id="addr-phone"
            inputMode="tel"
            className={FIELD_CLASS}
            value={fields.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>
      </div>

      {/* Row 5: email (optional, full width) */}
      <div>
        <label className={LABEL_CLASS} htmlFor="addr-email">
          {a.email}
        </label>
        <input
          id="addr-email"
          inputMode="email"
          className={FIELD_CLASS}
          value={fields.email}
          onChange={(e) => setField("email", e.target.value)}
        />
      </div>
    </div>
  );
}
