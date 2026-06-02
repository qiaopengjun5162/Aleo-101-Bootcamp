export interface AddressFields {
  country: string;
  province: string;
  city: string;
  street: string;
  lastName: string;
  firstName: string;
  phonePrefix: string;
  phone: string;
  email: string;
}

const FIELD_ORDER: readonly (keyof AddressFields)[] = [
  "country",
  "province",
  "city",
  "street",
  "lastName",
  "firstName",
  "phonePrefix",
  "phone",
  "email",
] as const;

/** Strip pipe delimiters then trim surrounding whitespace from a field value. */
const sanitize = (value: string): string => value.replace(/\|/g, "").trim();

/**
 * Pipe-join the 9 address fields in fixed order. Each value is trimmed and any
 * `|` characters inside individual values are stripped first so the encoding is
 * unambiguous. Empty optionals become "".
 */
export function encodeAddress(fields: AddressFields): string {
  return FIELD_ORDER.map((key) => sanitize(fields[key] ?? "")).join("|");
}

/**
 * Inverse of `encodeAddress`. Splits on `|` and tolerates fewer than 9
 * segments (missing segments default to ""). Round-trip safe for any input
 * that contains no pipe characters.
 */
export function decodeAddress(data: string): AddressFields {
  const parts = data.split("|");
  const fields = {} as AddressFields;
  FIELD_ORDER.forEach((key, index) => {
    fields[key] = parts[index] ?? "";
  });
  return fields;
}
