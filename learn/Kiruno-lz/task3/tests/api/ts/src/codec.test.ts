// L2 contract tests: PII payload codec (encode / decode round-trip).
//
// Subject under test: frontend/src/lib/codec.ts
// Spec references:
//   - docs/06-acceptance-criteria.md §4.2 (SA-01, SA-03, DR-01)
//   - docs/02-data-model.md §3 (UTF-8 packing/unpacking, 208-byte data cap)
//
// Import strategy: relative path with explicit `.ts` extension.
// Bun's loader requires the extension for cross-package imports under
// `moduleResolution: "bundler"`; path aliases are not used to keep the
// test files runnable from the repo root without extra config.

import { describe, it, expect } from "bun:test";
import {
  decodePIIPayload,
  decodePIIPayloadFromFields,
  encodePIIPayload,
  type PIIPayloadEncoded,
} from "../../../../frontend/src/lib/codec.ts";

// Build a PIIRecord-like wrapper from an encoded payload so we can drive
// `decodePIIPayload`, which expects `{ data: { payload: ... } }`.
function wrapEncoded(encoded: PIIPayloadEncoded) {
  return {
    data: {
      payload: {
        category: encoded.category,
        label_lo: encoded.label_lo,
        label_hi: encoded.label_hi,
        data: encoded.data,
        data_len: encoded.data_len,
      },
    },
  };
}

// Parse a Leo u128 literal (e.g. "12345u128") back to bigint.
function parseU128(literal: string): bigint {
  return BigInt(literal.replace(/u128$/, ""));
}

describe("SA-01: encodePIIPayload Leo literal format", () => {
  it("SA-01-a: emits category as <n>u8", () => {
    const encoded = encodePIIPayload({
      category: 1,
      label: "email",
      data: "user@example.com",
    });
    expect(encoded.category).toMatch(/^\d+u8$/);
    expect(encoded.category).toBe("1u8");
  });

  it("SA-01-b: emits label_lo / label_hi as <n>u128", () => {
    const encoded = encodePIIPayload({
      category: 2,
      label: "phone",
      data: "+1-555-0100",
    });
    expect(encoded.label_lo).toMatch(/^\d+u128$/);
    expect(encoded.label_hi).toMatch(/^\d+u128$/);
  });

  it("SA-01-c: emits data as length-13 array of u128 literals", () => {
    const encoded = encodePIIPayload({
      category: 3,
      label: "addr",
      data: "123 Main St, Springfield",
    });
    expect(encoded.data).toHaveLength(13);
    for (const slot of encoded.data) {
      expect(slot).toMatch(/^\d+u128$/);
    }
  });

  it("SA-01-d: emits data_len as <n>u32 matching UTF-8 byte length", () => {
    const ascii = encodePIIPayload({ category: 1, label: "x", data: "hello" });
    expect(ascii.data_len).toMatch(/^\d+u32$/);
    expect(ascii.data_len).toBe("5u32");

    const cjk = encodePIIPayload({ category: 3, label: "x", data: "北京" });
    // Each CJK char encodes to 3 UTF-8 bytes; "北京" → 6 bytes.
    expect(cjk.data_len).toBe("6u32");
  });

  it("SA-01-e: rejects category outside [0, 255]", () => {
    expect(() =>
      encodePIIPayload({ category: -1, label: "x", data: "y" }),
    ).toThrow(/category/);
    expect(() =>
      encodePIIPayload({ category: 256, label: "x", data: "y" }),
    ).toThrow(/category/);
  });

  it("SA-01-f: little-endian byte order in data[0]", () => {
    // First-byte 'A' (0x41) should occupy the lowest 8 bits of data[0].
    const encoded = encodePIIPayload({
      category: 1,
      label: "",
      data: "A",
    });
    const slot0 = parseU128(encoded.data[0] ?? "0u128");
    expect(slot0 & 0xffn).toBe(0x41n);
  });
});

describe("SA-03: encodePIIPayload data_len boundary behaviour", () => {
  it("SA-03-a: data_len = 0 when input is empty string", () => {
    const encoded = encodePIIPayload({ category: 1, label: "", data: "" });
    expect(encoded.data_len).toBe("0u32");
    // All 13 slots must be zero-padded.
    for (const slot of encoded.data) {
      expect(parseU128(slot)).toBe(0n);
    }
  });

  it("SA-03-b: data_len = 207 fits inside the 208-byte cap", () => {
    const input = "A".repeat(207);
    const encoded = encodePIIPayload({ category: 1, label: "", data: input });
    expect(encoded.data_len).toBe("207u32");
  });

  it("SA-03-c: data_len = 208 fills the cap exactly", () => {
    const input = "A".repeat(208);
    const encoded = encodePIIPayload({ category: 1, label: "", data: input });
    expect(encoded.data_len).toBe("208u32");
  });

  it("SA-03-d: data_len for 209-byte input is truncated to 208 (not 209)", () => {
    // Per docs/02 §3.3 the spec choice is "truncate, not throw" for ASCII
    // boundary overflow. The encoded `data_len` must therefore never exceed
    // the 208-byte cap.
    const input = "A".repeat(209);
    const encoded = encodePIIPayload({ category: 1, label: "", data: input });
    const dataLen = Number(encoded.data_len.replace(/u32$/, ""));
    expect(dataLen).toBeLessThanOrEqual(208);
    expect(dataLen).toBe(208);
  });

  it("SA-03-e: truncation respects UTF-8 character boundaries", () => {
    // A CJK char is 3 UTF-8 bytes; fill exactly to 208 with 69×3=207 bytes
    // plus one more byte over the limit → the codec must rewind to a clean
    // boundary so we never emit a half-character.
    const charsThatExceed = "北".repeat(70); // 70 * 3 = 210 bytes
    const encoded = encodePIIPayload({
      category: 3,
      label: "",
      data: charsThatExceed,
    });
    const dataLen = Number(encoded.data_len.replace(/u32$/, ""));
    expect(dataLen % 3).toBe(0); // every CJK char is 3 bytes, so dataLen
    expect(dataLen).toBeLessThanOrEqual(208);

    // Round-trip the truncated output to ensure the trailing bytes form
    // a valid UTF-8 sequence (no replacement character).
    const decoded = decodePIIPayload(wrapEncoded(encoded));
    expect(decoded.data).not.toContain("�");
  });
});

describe("DR-01: encode → decode round-trip preserves byte-level content", () => {
  const fixtures = [
    { name: "ASCII email", category: 2, label: "email", data: "user@example.com" },
    { name: "ASCII phone", category: 1, label: "phone", data: "+1-800-555-0100" },
    {
      name: "ASCII address",
      category: 3,
      label: "home",
      data: "123 Main St, Springfield, IL 62701",
    },
    { name: "empty data", category: 0, label: "empty", data: "" },
    { name: "single byte", category: 1, label: "a", data: "A" },
    { name: "exactly 208 ASCII bytes", category: 1, label: "max", data: "A".repeat(208) },
    { name: "CJK", category: 3, label: "地址", data: "北京市朝阳区建国路" },
    { name: "UTF-8 emoji", category: 3, label: "emoji", data: "Hi 👋 there" },
    { name: "mixed scripts", category: 3, label: "mix", data: "John 张三 +86-10-1234" },
  ] as const;

  for (const fx of fixtures) {
    it(`DR-01-${fx.name}: encode→decode is idempotent`, () => {
      const encoded = encodePIIPayload({
        category: fx.category,
        label: fx.label,
        data: fx.data,
      });
      const decoded = decodePIIPayload(wrapEncoded(encoded));
      expect(decoded.category).toBe(fx.category);
      expect(decoded.label).toBe(fx.label);
      expect(decoded.data).toBe(fx.data);
    });
  }

  it("DR-01-string-payload: decoder also accepts a flat payload string", () => {
    const encoded = encodePIIPayload({
      category: 2,
      label: "email",
      data: "test@example.com",
    });
    const payloadString = `{ category: ${encoded.category}, label_lo: ${encoded.label_lo}, label_hi: ${encoded.label_hi}, data: [${encoded.data.join(", ")}], data_len: ${encoded.data_len} }`;
    const decoded = decodePIIPayload({ data: { payload: payloadString } });
    expect(decoded.category).toBe(2);
    expect(decoded.label).toBe("email");
    expect(decoded.data).toBe("test@example.com");
  });

  it("DR-01-bigint-fields: decoder accepts bigint field values directly", () => {
    const encoded = encodePIIPayload({
      category: 1,
      label: "phone",
      data: "555-0100",
    });
    const decoded = decodePIIPayloadFromFields({
      category: BigInt(encoded.category.replace(/u8$/, "")),
      label_lo: BigInt(encoded.label_lo.replace(/u128$/, "")),
      label_hi: BigInt(encoded.label_hi.replace(/u128$/, "")),
      data: encoded.data.map((s) => BigInt(s.replace(/u128$/, ""))),
      data_len: BigInt(encoded.data_len.replace(/u32$/, "")),
    });
    expect(decoded.category).toBe(1);
    expect(decoded.label).toBe("phone");
    expect(decoded.data).toBe("555-0100");
  });
});
