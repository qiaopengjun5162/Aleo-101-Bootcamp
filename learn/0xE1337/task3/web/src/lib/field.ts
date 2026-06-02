// Browser-side helpers to produce Aleo `field` values without any WASM/SDK.
//
// private_gate_pass never asks the browser to reproduce an on-chain hash — the
// nullifier is derived ON-CHAIN from a private record field. The browser only
// needs to (a) map human names (issuer / gate) to a deterministic field, and
// (b) mint a random per-credential secret. Both stay < the Aleo field prime by
// using at most 31 bytes (248 bits < ~252.6 bits).

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic name -> raw field value (first 31 bytes of SHA-256, big-endian). */
export async function nameToField(name: string): Promise<string> {
  const hex = (await sha256Hex(name.trim())).slice(0, 62);
  return BigInt("0x" + hex).toString();
}

/** A fresh random secret as a raw field value (31 random bytes). */
export function randomFieldValue(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return BigInt("0x" + hex).toString();
}

/** Current epoch = whole days since the Unix epoch (a simple rotating period). */
export function currentEpoch(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export const toField = (raw: string) => `${raw}field`;
