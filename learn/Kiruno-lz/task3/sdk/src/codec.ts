// Endianness: little-endian (byte[0] is the lowest 8 bits of the u128)
// per docs/02-data-model.md section 3.1 packUtf8ToU128Array.

export interface PIIPayloadInput {
  category: number;
  label: string;
  data: string;
}

export interface PIIPayloadEncoded {
  category: string;
  label_lo: string;
  label_hi: string;
  data: string[];
  data_len: string;
}

export interface PIIPayloadDecoded {
  category: number;
  label: string;
  data: string;
}

export interface PIIPayloadRecordFields {
  category: string | number | bigint;
  label_lo: string | bigint;
  label_hi: string | bigint;
  data: ReadonlyArray<string | bigint> | string;
  data_len: string | number | bigint;
}

export interface PIIRecordLike {
  data: {
    payload: PIIPayloadRecordFields | string;
  } & Record<string, unknown>;
}

const DATA_SLOTS = 13;
const SLOT_BYTES = 16;
const DATA_MAX_BYTES = DATA_SLOTS * SLOT_BYTES;
const LABEL_SLOTS = 2;
const LABEL_MAX_BYTES = LABEL_SLOTS * SLOT_BYTES;

function truncateUtf8(bytes: Uint8Array, maxBytes: number): Uint8Array {
  if (bytes.length <= maxBytes) return bytes;
  let cut = maxBytes;
  while (cut > 0) {
    const b = bytes[cut];
    if (b === undefined) break;
    if (b < 0x80 || b >= 0xc0) break;
    cut -= 1;
  }
  return bytes.slice(0, cut);
}

function packBytesToU128Array(bytes: Uint8Array, slots: number): bigint[] {
  const result: bigint[] = new Array(slots).fill(0n);
  for (let slot = 0; slot < slots; slot++) {
    let value = 0n;
    for (let byte = 0; byte < SLOT_BYTES; byte++) {
      const idx = slot * SLOT_BYTES + byte;
      const b = idx < bytes.length ? BigInt(bytes[idx] ?? 0) : 0n;
      value |= b << BigInt(byte * 8);
    }
    result[slot] = value;
  }
  return result;
}

export function unpackU128ArrayToBytes(values: readonly bigint[], dataLen: number): Uint8Array {
  const out: number[] = [];
  for (let slot = 0; slot < values.length; slot++) {
    const value = values[slot] ?? 0n;
    for (let byte = 0; byte < SLOT_BYTES; byte++) {
      const idx = slot * SLOT_BYTES + byte;
      if (idx >= dataLen) break;
      out.push(Number((value >> BigInt(byte * 8)) & 0xffn));
    }
  }
  return new Uint8Array(out.slice(0, dataLen));
}

function parseFieldLiteral(input: string | number | bigint, suffix: string): bigint {
  if (typeof input === "bigint") return input;
  if (typeof input === "number") return BigInt(input);
  const trimmed = input.trim();
  const stripped = trimmed.endsWith(suffix)
    ? trimmed.slice(0, -suffix.length)
    : trimmed;
  return BigInt(stripped);
}

function parseDataArray(
  data: ReadonlyArray<string | bigint> | string,
): bigint[] {
  if (Array.isArray(data)) {
    return data.map((v) => parseFieldLiteral(v, "u128"));
  }
  if (typeof data === "string") {
    const inner = data.trim().replace(/^\[/, "").replace(/\]$/, "");
    const parts = inner.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.map((v) => parseFieldLiteral(v, "u128"));
  }
  throw new Error("invalid data field shape");
}

export function encodePIIPayload(input: PIIPayloadInput): PIIPayloadEncoded {
  if (input.category < 0 || input.category > 255) {
    throw new Error("category must be in [0, 255]");
  }

  const encoder = new TextEncoder();
  const labelBytesRaw = encoder.encode(input.label);
  const labelBytes = truncateUtf8(labelBytesRaw, LABEL_MAX_BYTES);
  const dataBytesRaw = encoder.encode(input.data);
  const dataBytes = truncateUtf8(dataBytesRaw, DATA_MAX_BYTES);

  const labelPacked = packBytesToU128Array(labelBytes, LABEL_SLOTS);
  const dataPacked = packBytesToU128Array(dataBytes, DATA_SLOTS);

  return {
    category: `${input.category}u8`,
    label_lo: `${labelPacked[0] ?? 0n}u128`,
    label_hi: `${labelPacked[1] ?? 0n}u128`,
    data: dataPacked.map((v) => `${v}u128`),
    data_len: `${dataBytes.length}u32`,
  };
}

export function decodePIIPayload(record: PIIRecordLike): PIIPayloadDecoded {
  const payload = record.data.payload;
  if (typeof payload === "string") {
    return decodePIIPayloadFromString(payload);
  }
  return decodePIIPayloadFromFields(payload);
}

export function decodePIIPayloadFromFields(
  fields: PIIPayloadRecordFields,
): PIIPayloadDecoded {
  const category = Number(parseFieldLiteral(fields.category, "u8"));
  const labelLo = parseFieldLiteral(fields.label_lo, "u128");
  const labelHi = parseFieldLiteral(fields.label_hi, "u128");
  const dataValues = parseDataArray(fields.data);
  const dataLen = Number(parseFieldLiteral(fields.data_len, "u32"));

  const labelBytesAll = unpackU128ArrayToBytes([labelLo, labelHi], LABEL_MAX_BYTES);
  let labelEnd = labelBytesAll.length;
  while (labelEnd > 0 && labelBytesAll[labelEnd - 1] === 0) labelEnd -= 1;
  const labelBytes = labelBytesAll.slice(0, labelEnd);

  const dataBytes = unpackU128ArrayToBytes(dataValues, dataLen);
  const decoder = new TextDecoder("utf-8", { fatal: false });

  return {
    category,
    label: decoder.decode(labelBytes),
    data: decoder.decode(dataBytes),
  };
}

export function decodePIIPayloadFromString(payload: string): PIIPayloadDecoded {
  const categoryMatch = payload.match(/category:\s*(\d+)u8/);
  const labelLoMatch = payload.match(/label_lo:\s*(\d+)u128/);
  const labelHiMatch = payload.match(/label_hi:\s*(\d+)u128/);
  const dataMatch = payload.match(/data:\s*(\[[^\]]*\])/);
  const dataLenMatch = payload.match(/data_len:\s*(\d+)u32/);

  if (!categoryMatch || !labelLoMatch || !labelHiMatch || !dataMatch || !dataLenMatch) {
    throw new Error("invalid payload string format");
  }

  return decodePIIPayloadFromFields({
    category: categoryMatch[1] ?? "0",
    label_lo: labelLoMatch[1] ?? "0",
    label_hi: labelHiMatch[1] ?? "0",
    data: dataMatch[1] ?? "[]",
    data_len: dataLenMatch[1] ?? "0",
  });
}

export function buildPayloadStruct(encoded: PIIPayloadEncoded): string {
  return `{ category: ${encoded.category}, label_lo: ${encoded.label_lo}, label_hi: ${encoded.label_hi}, data: [${encoded.data.join(", ")}], data_len: ${encoded.data_len} }`;
}
