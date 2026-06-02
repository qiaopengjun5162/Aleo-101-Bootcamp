// Shared transaction-status polling. Wallets (notably Shield) return a TEMPORARY
// id from executeTransaction and keep proving/broadcasting asynchronously, so
// transactionStatus throws "Transaction not found" until the tx is registered.
// We tolerate that and keep polling, preferring the on-chain id (at1…) once it
// appears.

export type StatusFn = (
  id: string,
) => Promise<{ status: string; transactionId?: string }>;

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 80;

export async function pollTransaction(
  transactionStatus: StatusFn,
  tempId: string,
  onOnchainId?: (id: string) => void,
): Promise<{ status: string; onchainId?: string }> {
  let status = "pending";
  let onchainId: string | undefined;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const resp = await transactionStatus(tempId);
      if (resp.transactionId) {
        onchainId = resp.transactionId;
        onOnchainId?.(resp.transactionId);
      }
      status = resp.status || "pending";
      if (status !== "pending") break;
    } catch (e) {
      // still proving / not yet broadcast — keep waiting
      console.log(
        "[tx] status poll not ready:",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return { status, onchainId };
}

export type TxPhase =
  | "idle"
  | "building"
  | "signing"
  | "pending"
  | "accepted"
  | "failed"
  | "rejected"
  | "error";

export function terminalPhase(status: string): TxPhase {
  return status === "accepted"
    ? "accepted"
    : status === "failed"
      ? "failed"
      : status === "rejected"
        ? "rejected"
        : "pending";
}
