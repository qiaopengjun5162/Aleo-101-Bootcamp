import { test, expect, describe } from "bun:test";
import {
  buildCreatePIIInputs,
  buildSharePIIInputs,
  buildConsumeSharedInputs,
  buildMarkRevokedInputs,
  generateNonce,
} from "./inputs";

const PAYLOAD = { category: 1, label: "email", data: "a@b.com" };

describe("buildCreatePIIInputs", () => {
  test("returns 4 inputs with correct suffixes/values", () => {
    const out = buildCreatePIIInputs({
      payload: PAYLOAD,
      nonce: 123n,
      createdAt: 1000n,
    });
    expect(out.length).toBe(4);
    expect(out[1].endsWith("field")).toBe(true);
    expect(out[2].endsWith("u8")).toBe(true);
    expect(out[2]).toBe("1u8");
    expect(out[3].endsWith("u64")).toBe(true);
  });

  test("throws on createdAt <= 0", () => {
    expect(() =>
      buildCreatePIIInputs({ payload: PAYLOAD, nonce: 1n, createdAt: 0n }),
    ).toThrow();
  });

  test("throws on version !== 1", () => {
    expect(() =>
      buildCreatePIIInputs({
        payload: PAYLOAD,
        nonce: 1n,
        createdAt: 1n,
        version: 2,
      }),
    ).toThrow();
  });

  test("deterministic with fixed nonce", () => {
    const a = buildCreatePIIInputs({ payload: PAYLOAD, nonce: 42n, createdAt: 9n });
    const b = buildCreatePIIInputs({ payload: PAYLOAD, nonce: 42n, createdAt: 9n });
    expect(a).toEqual(b);
    expect(a[1]).toBe("42field");
  });
});

describe("buildSharePIIInputs", () => {
  const base = {
    sourceRecord: { id: "rec-source" },
    recipient: "aleo1recipient",
    expiresInBlocks: 100,
    purpose: 1,
    currentBlock: 500,
    newNonce: 77n,
  };

  test("returns 6 inputs with correct shapes", () => {
    const out = buildSharePIIInputs(base);
    expect(out.length).toBe(6);
    expect(out[0]).toBe("rec-source");
    expect(out[1]).toBe("aleo1recipient");
    expect(out[2]).toBe("600u64"); // 500 + 100
    expect(out[3]).toBe("1u128");
    expect(out[4]).toBe("77field");
    expect(out[5]).toBe("500u64");
  });

  test("throws on expiresInBlocks <= 0", () => {
    expect(() => buildSharePIIInputs({ ...base, expiresInBlocks: 0 })).toThrow();
  });

  test("throws on expiresInBlocks >= 2^32", () => {
    expect(() =>
      buildSharePIIInputs({ ...base, expiresInBlocks: 2 ** 32 }),
    ).toThrow();
  });

  test("throws on purpose = 0", () => {
    expect(() => buildSharePIIInputs({ ...base, purpose: 0 })).toThrow();
  });

  test("throws on purpose = 5", () => {
    expect(() => buildSharePIIInputs({ ...base, purpose: 5 })).toThrow();
  });

  test("throws on purpose = 999", () => {
    expect(() => buildSharePIIInputs({ ...base, purpose: 999 })).toThrow();
  });

  test("throws on recipient not starting with aleo1", () => {
    expect(() =>
      buildSharePIIInputs({ ...base, recipient: "bleo1xyz" }),
    ).toThrow();
  });

  test("accepts purpose = 1", () => {
    expect(buildSharePIIInputs({ ...base, purpose: 1 })[3]).toBe("1u128");
  });

  test("accepts purpose = 4", () => {
    expect(buildSharePIIInputs({ ...base, purpose: 4 })[3]).toBe("4u128");
  });

  test("accepts purpose = 1000", () => {
    expect(buildSharePIIInputs({ ...base, purpose: 1000 })[3]).toBe("1000u128");
  });
});

describe("buildConsumeSharedInputs", () => {
  test("returns [sharedRecord.id]", () => {
    const out = buildConsumeSharedInputs({ sharedRecord: { id: "shared-99" } });
    expect(out).toEqual(["shared-99"]);
  });
});

describe("buildMarkRevokedInputs", () => {
  test("bigint nonce -> <n>field", () => {
    const out = buildMarkRevokedInputs({
      originalNonce: 555n,
      proofRecord: { id: "proof-1" },
    });
    expect(out).toEqual(["555field", "proof-1"]);
  });

  test("string nonce already ending field passes through", () => {
    const out = buildMarkRevokedInputs({
      originalNonce: "888field",
      proofRecord: { id: "proof-2" },
    });
    expect(out).toEqual(["888field", "proof-2"]);
  });

  test("string nonce without suffix gets field appended", () => {
    const out = buildMarkRevokedInputs({
      originalNonce: "999",
      proofRecord: { id: "proof-3" },
    });
    expect(out).toEqual(["999field", "proof-3"]);
  });
});

describe("generateNonce", () => {
  const FIELD_MODULUS = BigInt(
    "8444461749428370424248824938781546531375899335154063827935233455917409239041",
  );

  test("returns bigint in (0, FIELD_MODULUS) and two calls differ", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(typeof a).toBe("bigint");
    expect(a > 0n).toBe(true);
    expect(a < FIELD_MODULUS).toBe(true);
    expect(a).not.toBe(b);
  });
});
