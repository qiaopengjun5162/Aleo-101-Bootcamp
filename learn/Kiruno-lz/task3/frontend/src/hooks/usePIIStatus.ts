import { useCallback, useState } from "react";

export type PIIStatus = "idle" | "pending" | "success" | "failure";

export interface PIIOpState {
  status: PIIStatus;
  txId: string | null;
  error: string | null;
}

const INITIAL: PIIOpState = { status: "idle", txId: null, error: null };

export function usePIIStatus() {
  const [state, setState] = useState<PIIOpState>(INITIAL);

  const setPending = useCallback(() => {
    setState({ status: "pending", txId: null, error: null });
  }, []);

  const setSuccess = useCallback((txId: string) => {
    setState({ status: "success", txId, error: null });
  }, []);

  const setFailure = useCallback((error: string) => {
    setState({ status: "failure", txId: null, error });
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, setPending, setSuccess, setFailure, reset };
}

export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
