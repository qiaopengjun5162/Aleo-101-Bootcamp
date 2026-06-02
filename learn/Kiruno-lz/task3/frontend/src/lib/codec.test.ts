import { test, expect, describe } from "bun:test";
import {
  encodePIIPayload,
  decodePIIPayload,
  decodePIIPayloadFromFields,
  buildPayloadStruct,
  type PIIPayloadInput,
} from "./codec";

const REPLACEMENT = "�";

function roundTrip(input: PIIPayloadInput) {
  return decodePIIPayloadFromFields(encodePIIPayload(input));
}

describe("codec round-trip", () => {
  test("ASCII", () => {
    const out = roundTrip({ category: 1, label: "email", data: "a@b.com" });
    expect(out.category).toBe(1);
    expect(out.label).toBe("email");
    expect(out.data).toBe("a@b.com");
  });

  test("Chinese UTF-8", () => {
    const out = roundTrip({ category: 2, label: "地址", data: "北京市朝阳区" });
    expect(out.label).toBe("地址");
    expect(out.data).toBe("北京市朝阳区");
  });

  test("emoji", () => {
    const out = roundTrip({ category: 3, label: "emoji", data: "👍🚀🎉" });
    expect(out.data).toBe("👍🚀🎉");
  });

  test("empty data", () => {
    const out = roundTrip({ category: 0, label: "k", data: "" });
    expect(out.data).toBe("");
    expect(out.label).toBe("k");
  });

  test("empty label", () => {
    const out = roundTrip({ category: 0, label: "", data: "value" });
    expect(out.label).toBe("");
    expect(out.data).toBe("value");
  });
});

describe("codec truncation", () => {
  test("data > 208 bytes truncated without splitting multibyte char", () => {
    // Each 北 is 3 bytes. 70 * 3 = 210 > 208. Truncation must cut at char boundary.
    const data = "北".repeat(70);
    const out = roundTrip({ category: 1, label: "x", data });
    expect(out.data.includes(REPLACEMENT)).toBe(false);
    // 208 / 3 = 69 chars max (69*3=207 bytes), 70th char would need byte 208..210.
    expect(out.data).toBe("北".repeat(69));
    expect(data.startsWith(out.data)).toBe(true);
  });

  test("label > 32 bytes truncated without splitting multibyte char", () => {
    // 11 * 3 = 33 > 32. Must cut to 10 chars (30 bytes).
    const label = "市".repeat(11);
    const out = roundTrip({ category: 1, label, data: "d" });
    expect(out.label.includes(REPLACEMENT)).toBe(false);
    expect(out.label).toBe("市".repeat(10));
    expect(label.startsWith(out.label)).toBe(true);
  });
});

describe("codec little-endian correctness", () => {
  test("'AB' -> lo byte first => 0x4241 = 16961", () => {
    const enc = encodePIIPayload({ category: 1, label: "AB", data: "AB" });
    // A=0x41 at byte0 (low), B=0x42 at byte1 => 0x42*256 + 0x41 = 16961
    expect(enc.label_lo).toBe("16961u128");
    expect(enc.data[0]).toBe("16961u128");
  });
});

describe("codec validation", () => {
  test("throws when category < 0", () => {
    expect(() => encodePIIPayload({ category: -1, label: "a", data: "b" })).toThrow();
  });

  test("throws when category > 255", () => {
    expect(() => encodePIIPayload({ category: 256, label: "a", data: "b" })).toThrow();
  });
});

describe("buildPayloadStruct", () => {
  test("produces struct string with required keys", () => {
    const enc = encodePIIPayload({ category: 5, label: "lbl", data: "data" });
    const s = buildPayloadStruct(enc);
    expect(s).toContain("category:");
    expect(s).toContain("label_lo:");
    expect(s).toContain("data: [");
    expect(s).toContain("data_len:");
  });
});

describe("decodePIIPayload string path", () => {
  test("parses STRING payload equivalently to fields path", () => {
    const enc = encodePIIPayload({ category: 7, label: "name", data: "北京hi" });
    const structStr = buildPayloadStruct(enc);

    const fromString = decodePIIPayload({ data: { payload: structStr } });
    const fromFields = decodePIIPayloadFromFields(enc);

    expect(fromString).toEqual(fromFields);
    expect(fromString.category).toBe(7);
    expect(fromString.label).toBe("name");
    expect(fromString.data).toBe("北京hi");
  });
});
