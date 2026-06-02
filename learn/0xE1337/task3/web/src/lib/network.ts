// Public, no-wallet on-chain reads. Only public mappings are visible here —
// private Credential records are NOT readable via REST (only the owner's wallet
// can decrypt them).

import { PROGRAM_ID, READ_API } from "./constants";

/** Per-gate public access counter. Pass the raw gate_id field value. null on error. */
export async function getGateAccessCount(
  gateIdRaw: string,
): Promise<bigint | null> {
  try {
    const res = await fetch(
      `${READ_API}/program/${PROGRAM_ID}/mapping/gate_access_count/${gateIdRaw}field`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as string | null; // "1u64" or null
    if (!raw) return 0n;
    return BigInt(String(raw).replace(/u64$/, ""));
  } catch {
    return null;
  }
}

/** Whether a nullifier has been spent (public). */
export async function isNullifierSpent(nullifierRaw: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${READ_API}/program/${PROGRAM_ID}/mapping/spent_nullifiers/${nullifierRaw}field`,
      { cache: "no-store" },
    );
    if (!res.ok) return false;
    const raw = (await res.json()) as string | null;
    return raw === "true";
  } catch {
    return false;
  }
}

export async function programIsLive(): Promise<boolean> {
  try {
    const res = await fetch(`${READ_API}/program/${PROGRAM_ID}`, {
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
