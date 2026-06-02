import {
  buildPayloadStruct,
  encodePIIPayload,
  type PIIPayloadEncoded,
  type PIIPayloadInput,
} from "./codec";

export const PII_PROGRAM_ID = "pii_protocol_v1.aleo";
export const PII_CHAIN_ID = "testnetbeta";
export const DEFAULT_FEE_MICROCREDITS = 50_000;

const FIELD_MODULUS = BigInt(
  "8444461749428370424248824938781546531375899335154063827935233455917409239041",
);

export function generateNonce(): bigint {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) | BigInt(bytes[i] ?? 0);
  }
  if (value === 0n) value = 1n;
  return value % FIELD_MODULUS;
}

export interface CreatePIIInput {
  payload: PIIPayloadInput;
  nonce?: bigint;
  version?: number;
  createdAt: bigint;
}

export type CreatePIIInputs = readonly [
  payload: string,
  nonce: string,
  version: string,
  createdAt: string,
];

export function buildCreatePIIInputs(input: CreatePIIInput): CreatePIIInputs {
  if (input.createdAt <= 0n) {
    throw new Error("createdAt must be positive");
  }
  const version = input.version ?? 1;
  if (version !== 1) {
    throw new Error("version must be 1");
  }
  const encoded: PIIPayloadEncoded = encodePIIPayload(input.payload);
  const nonce = input.nonce ?? generateNonce();
  return [
    buildPayloadStruct(encoded),
    `${nonce}field`,
    `${version}u8`,
    `${input.createdAt}u64`,
  ] as const;
}

export interface SharePIIInput {
  sourceRecord: { id: string };
  recipient: string;
  expiresInBlocks: number;
  purpose: number;
  currentBlock: number;
  newNonce?: bigint;
}

export type SharePIIInputs = readonly [
  source: string,
  recipient: string,
  expiresAt: string,
  purpose: string,
  newNonce: string,
  sharedAt: string,
];

export function buildSharePIIInputs(input: SharePIIInput): SharePIIInputs {
  if (input.expiresInBlocks <= 0) {
    throw new Error("expiresInBlocks must be positive");
  }
  if (input.expiresInBlocks >= 2 ** 32) {
    throw new Error("expiresInBlocks out of range");
  }
  const allowedPurpose = input.purpose >= 1 && input.purpose <= 4 || input.purpose >= 1000;
  if (!allowedPurpose) {
    throw new Error("invalid purpose code");
  }
  if (!input.recipient.startsWith("aleo1")) {
    throw new Error("recipient must be a valid Aleo address");
  }
  const nonce = input.newNonce ?? generateNonce();
  const expiresAt = BigInt(input.currentBlock) + BigInt(input.expiresInBlocks);
  return [
    input.sourceRecord.id,
    input.recipient,
    `${expiresAt}u64`,
    `${input.purpose}u128`,
    `${nonce}field`,
    `${input.currentBlock}u64`,
  ] as const;
}

export interface ConsumeSharedInput {
  sharedRecord: { id: string };
}

export type ConsumeSharedInputs = readonly [string];

export function buildConsumeSharedInputs(
  input: ConsumeSharedInput,
): ConsumeSharedInputs {
  return [input.sharedRecord.id] as const;
}

export interface MarkRevokedInput {
  originalNonce: bigint | string;
  proofRecord: { id: string };
}

export type MarkRevokedInputs = readonly [string, string];

export function buildMarkRevokedInputs(input: MarkRevokedInput): MarkRevokedInputs {
  const nonceLiteral =
    typeof input.originalNonce === "bigint"
      ? `${input.originalNonce}field`
      : input.originalNonce.endsWith("field")
        ? input.originalNonce
        : `${input.originalNonce}field`;
  return [nonceLiteral, input.proofRecord.id] as const;
}
