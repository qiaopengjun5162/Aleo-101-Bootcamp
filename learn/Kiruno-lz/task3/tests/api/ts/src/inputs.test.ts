// L2 contract tests: transition input builders for the Aleo PII Protocol.
//
// Subject under test: frontend/src/lib/inputs.ts
// Spec references:
//   - docs/06-acceptance-criteria.md §4.2 (EI-01, EI-02, SA-02, CS-01, CS-02)
//   - docs/03-program-interface.md (transition signatures)
//   - docs/02-data-model.md §2.3 (purpose enum, expires_at semantics)

import { describe, it, expect } from "bun:test";
import {
  buildCreatePIIInputs,
  buildSharePIIInputs,
  buildConsumeSharedInputs,
  buildMarkRevokedInputs,
  generateNonce,
} from "../../../../frontend/src/lib/inputs.ts";

// ---------------------------------------------------------------------------
// Deterministic fixtures
// ---------------------------------------------------------------------------

const FIXED_CREATED_AT = 123456n;
const FIXED_NONCE = 999n;
const MOCK_RECORD_ID =
  "{ owner: aleo1abc000000000000000000000000000000000000000000000000000000000.private, _nonce: 111field.public }";
const MOCK_RECIPIENT =
  "aleo1receiver000000000000000000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// EI-01 — create_pii transition has exactly 4 typed inputs.
// ---------------------------------------------------------------------------

describe("EI-01: buildCreatePIIInputs returns [PIIPayload, field, u8, u64]", () => {
  it("EI-01-a: produces a 4-element tuple", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 2, label: "email", data: "user@example.com" },
      nonce: FIXED_NONCE,
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    expect(inputs).toHaveLength(4);
  });

  it("EI-01-b: inputs[0] is a PIIPayload struct literal", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 2, label: "email", data: "user@example.com" },
      nonce: FIXED_NONCE,
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    // The struct literal must start with `{` and contain every named field
    // declared by docs/02 §2.1 (category / label_lo / label_hi / data / data_len).
    expect(inputs[0]).toMatch(/^\{.*\}$/);
    expect(inputs[0]).toMatch(/category:\s*\d+u8/);
    expect(inputs[0]).toMatch(/label_lo:\s*\d+u128/);
    expect(inputs[0]).toMatch(/label_hi:\s*\d+u128/);
    expect(inputs[0]).toMatch(/data:\s*\[/);
    expect(inputs[0]).toMatch(/data_len:\s*\d+u32/);
    // The data array must contain exactly 13 u128 literals.
    const arrayMatch = inputs[0].match(/data:\s*\[([^\]]*)\]/);
    expect(arrayMatch).not.toBeNull();
    const slots = (arrayMatch?.[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(slots).toHaveLength(13);
    for (const slot of slots) {
      expect(slot).toMatch(/^\d+u128$/);
    }
  });

  it("EI-01-c: inputs[1] is a field literal carrying the supplied nonce", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 2, label: "email", data: "user@example.com" },
      nonce: FIXED_NONCE,
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    expect(inputs[1]).toMatch(/^\d+field$/);
    expect(BigInt(inputs[1].replace(/field$/, ""))).toBe(FIXED_NONCE);
  });

  it("EI-01-d: inputs[2] is a u8 version literal", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 1, label: "x", data: "y" },
      nonce: FIXED_NONCE,
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    expect(inputs[2]).toMatch(/^\d+u8$/);
    expect(inputs[2]).toBe("1u8");
  });

  it("EI-01-e: inputs[3] is a u64 createdAt literal", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 1, label: "x", data: "y" },
      nonce: FIXED_NONCE,
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    expect(inputs[3]).toMatch(/^\d+u64$/);
    expect(BigInt(inputs[3].replace(/u64$/, ""))).toBe(FIXED_CREATED_AT);
  });

  it("EI-01-f: auto-generates a nonce when not provided", () => {
    const inputs = buildCreatePIIInputs({
      payload: { category: 1, label: "x", data: "y" },
      version: 1,
      createdAt: FIXED_CREATED_AT,
    });
    expect(inputs[1]).toMatch(/^\d+field$/);
    expect(inputs[1]).not.toBe("0field");
  });
});

// ---------------------------------------------------------------------------
// EI-02 — share_pii transition has exactly 6 typed inputs, in canonical order.
// ---------------------------------------------------------------------------

describe("EI-02: buildSharePIIInputs returns [record, address, u64, u128, field, u64]", () => {
  function build() {
    return buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 100,
      purpose: 1,
      currentBlock: 12345,
      newNonce: FIXED_NONCE,
    });
  }

  it("EI-02-a: produces a 6-element tuple", () => {
    expect(build()).toHaveLength(6);
  });

  it("EI-02-b: inputs[0] is the source record literal (passed through verbatim)", () => {
    const inputs = build();
    expect(inputs[0]).toBe(MOCK_RECORD_ID);
  });

  it("EI-02-c: inputs[1] is an Aleo address literal", () => {
    const inputs = build();
    expect(inputs[1]).toBe(MOCK_RECIPIENT);
    expect(inputs[1]).toMatch(/^aleo1[a-z0-9]{58,}$/);
  });

  it("EI-02-d: inputs[2] is expires_at (u64) = currentBlock + expiresInBlocks", () => {
    const inputs = build();
    expect(inputs[2]).toMatch(/^\d+u64$/);
    expect(BigInt(inputs[2].replace(/u64$/, ""))).toBe(12345n + 100n);
  });

  it("EI-02-e: inputs[3] is purpose (u128)", () => {
    const inputs = build();
    expect(inputs[3]).toMatch(/^\d+u128$/);
    expect(BigInt(inputs[3].replace(/u128$/, ""))).toBe(1n);
  });

  it("EI-02-f: inputs[4] is new_nonce (field)", () => {
    const inputs = build();
    expect(inputs[4]).toMatch(/^\d+field$/);
    expect(BigInt(inputs[4].replace(/field$/, ""))).toBe(FIXED_NONCE);
  });

  it("EI-02-g: inputs[5] is shared_at (u64) = currentBlock", () => {
    const inputs = build();
    expect(inputs[5]).toMatch(/^\d+u64$/);
    expect(BigInt(inputs[5].replace(/u64$/, ""))).toBe(12345n);
  });
});

// ---------------------------------------------------------------------------
// SA-02 — strict positional Leo literal regex assertions on share_pii inputs.
// ---------------------------------------------------------------------------

describe("SA-02: buildSharePIIInputs positional Leo literal types", () => {
  it("SA-02: every index matches the canonical Leo type literal pattern", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 100,
      purpose: 1,
      currentBlock: 12345,
      newNonce: FIXED_NONCE,
    });
    expect(inputs).toHaveLength(6);

    // [0] source_record: opaque record plaintext literal (host-provided).
    expect(typeof inputs[0]).toBe("string");
    expect(inputs[0].length).toBeGreaterThan(0);

    // [1] recipient: aleo address.
    expect(inputs[1]).toMatch(/^aleo1[a-z0-9]{58,}$/);

    // [2] expires_at: u64.
    expect(inputs[2]).toMatch(/^\d+u64$/);
    expect(BigInt(inputs[2].replace(/u64$/, ""))).toBe(12445n);

    // [3] purpose: u128.
    expect(inputs[3]).toMatch(/^\d+u128$/);

    // [4] new_nonce: field.
    expect(inputs[4]).toMatch(/^\d+field$/);

    // [5] shared_at: u64.
    expect(inputs[5]).toMatch(/^\d+u64$/);
  });

  it("SA-02-auto-nonce: omitting newNonce still yields a valid field literal", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 50,
      purpose: 2,
      currentBlock: 9999,
    });
    expect(inputs[4]).toMatch(/^\d+field$/);
    expect(inputs[4]).not.toBe("0field");
  });
});

// ---------------------------------------------------------------------------
// CS-01 — Contract: expires_in_blocks must be positive (window > 0).
//   The current implementation does NOT validate this; this test documents
//   the positive-path contract and `todo`s the missing rejection branch.
// ---------------------------------------------------------------------------

describe("CS-01: buildSharePIIInputs honours a positive expires_in_blocks window", () => {
  it("CS-01-a: positive window yields expires_at = currentBlock + expiresInBlocks", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 1,
      purpose: 1,
      currentBlock: 1000,
      newNonce: FIXED_NONCE,
    });
    expect(BigInt(inputs[2].replace(/u64$/, ""))).toBe(1001n);
    expect(BigInt(inputs[5].replace(/u64$/, ""))).toBe(1000n);
    // Per docs/02 §2.3: expires_at MUST be strictly greater than shared_at.
    expect(BigInt(inputs[2].replace(/u64$/, ""))).toBeGreaterThan(
      BigInt(inputs[5].replace(/u64$/, "")),
    );
  });

  it("CS-01-b: large positive window is preserved without overflow", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 50_400, // ≈ 7 days per docs/02 §2.3 default
      purpose: 1,
      currentBlock: 1_000_000,
      newNonce: FIXED_NONCE,
    });
    expect(BigInt(inputs[2].replace(/u64$/, ""))).toBe(1_050_400n);
  });

  // The frontend SDK is expected to reject `expiresInBlocks <= 0` before the
  // transition reaches Leo (where `assert expires_at > shared_at` would fail).
  // The current `buildSharePIIInputs` implementation does not enforce this —
  // tracked as a follow-up for the frontend agent.
  it("CS-01-c: rejects expires_in_blocks = 0", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: MOCK_RECIPIENT,
        expiresInBlocks: 0,
        purpose: 1,
        currentBlock: 100,
      }),
    ).toThrow("expiresInBlocks must be positive");
  });

  it("CS-01-d: rejects negative expires_in_blocks", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: MOCK_RECIPIENT,
        expiresInBlocks: -1,
        purpose: 1,
        currentBlock: 100,
      }),
    ).toThrow("expiresInBlocks must be positive");
  });
});

// ---------------------------------------------------------------------------
// CS-02 — Contract: purpose must be a non-reserved enum value.
//   Per docs/02 §2.3 the canonical enum is {1..4} with ≥1000 reserved for
//   custom dApp use. The current implementation passes any number through
//   verbatim; this suite asserts the well-known codes serialise correctly
//   and `todo`s the missing reservation enforcement.
// ---------------------------------------------------------------------------

describe("CS-02: buildSharePIIInputs serialises purpose codes per docs/02 §2.3", () => {
  const validPurposes: ReadonlyArray<readonly [number, string]> = [
    [1, "ORDER_DELIVERY"],
    [2, "COURIER"],
    [3, "POSTAL"],
    [4, "MERCHANT_VERIFY"],
  ];

  for (const [code, label] of validPurposes) {
    it(`CS-02-${label}: purpose=${code} serialises to ${code}u128`, () => {
      const inputs = buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: MOCK_RECIPIENT,
        expiresInBlocks: 100,
        purpose: code,
        currentBlock: 100,
        newNonce: FIXED_NONCE,
      });
      expect(inputs[3]).toBe(`${code}u128`);
    });
  }

  it("CS-02-custom: custom purpose ≥ 1000 is preserved verbatim", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 100,
      purpose: 1234,
      currentBlock: 100,
      newNonce: FIXED_NONCE,
    });
    expect(inputs[3]).toBe("1234u128");
  });

  it("CS-02-reserved: rejects purpose = 0 (sentinel treated as reserved)", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: MOCK_RECIPIENT,
        expiresInBlocks: 10,
        purpose: 0,
        currentBlock: 100,
      }),
    ).toThrow("invalid purpose");
  });

  it("CS-02-range: rejects purpose 5..999 (non-reserved gap)", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: MOCK_RECIPIENT,
        expiresInBlocks: 10,
        purpose: 500,
        currentBlock: 100,
      }),
    ).toThrow("invalid purpose");
  });
});

// ---------------------------------------------------------------------------
// CS-03 — Contract: recipient must be a valid Aleo address.
// ---------------------------------------------------------------------------

describe("CS-03: buildSharePIIInputs validates recipient address", () => {
  it("CS-03-a: rejects non-aleo1 recipient (0x-prefixed)", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: "0x1234567890abcdef1234567890abcdef1234567890abcdef",
        expiresInBlocks: 10,
        purpose: 1,
        currentBlock: 100,
      }),
    ).toThrow("recipient must be a valid Aleo address");
  });

  it("CS-03-b: rejects empty recipient", () => {
    expect(() =>
      buildSharePIIInputs({
        sourceRecord: { id: MOCK_RECORD_ID },
        recipient: "",
        expiresInBlocks: 10,
        purpose: 1,
        currentBlock: 100,
      }),
    ).toThrow("recipient must be a valid Aleo address");
  });

  it("CS-03-c: accepts valid aleo1 recipient", () => {
    const inputs = buildSharePIIInputs({
      sourceRecord: { id: MOCK_RECORD_ID },
      recipient: MOCK_RECIPIENT,
      expiresInBlocks: 10,
      purpose: 1,
      currentBlock: 100,
    });
    expect(inputs[1]).toBe(MOCK_RECIPIENT);
  });
});

// ---------------------------------------------------------------------------
// Auxiliary contracts for buildConsumeSharedInputs / buildMarkRevokedInputs.
// These are not part of the EI-/SA-/CS- numbered matrix but exercise the
// same surface that the L2 layer covers, and keep schema regressions from
// slipping through.
// ---------------------------------------------------------------------------

describe("AUX: consume_shared and mark_revoked input builders", () => {
  it("AUX-CS: buildConsumeSharedInputs returns a single record-id input", () => {
    const inputs = buildConsumeSharedInputs({
      sharedRecord: { id: MOCK_RECORD_ID },
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toBe(MOCK_RECORD_ID);
  });

  it("AUX-MR-bigint: buildMarkRevokedInputs serialises bigint nonce as field", () => {
    const inputs = buildMarkRevokedInputs({
      originalNonce: 42n,
      proofRecord: { id: MOCK_RECORD_ID },
    });
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toBe("42field");
    expect(inputs[1]).toBe(MOCK_RECORD_ID);
  });

  it("AUX-MR-string: buildMarkRevokedInputs preserves pre-formatted field literal", () => {
    const inputs = buildMarkRevokedInputs({
      originalNonce: "777field",
      proofRecord: { id: MOCK_RECORD_ID },
    });
    expect(inputs[0]).toBe("777field");
  });

  it("AUX-NONCE: generateNonce returns a positive bigint within the field modulus", () => {
    const FIELD_MODULUS = BigInt(
      "8444461749428370424248824938781546531375899335154063827935233455917409239041",
    );
    const nonce = generateNonce();
    expect(typeof nonce).toBe("bigint");
    expect(nonce).toBeGreaterThan(0n);
    expect(nonce).toBeLessThan(FIELD_MODULUS);
  });
});
