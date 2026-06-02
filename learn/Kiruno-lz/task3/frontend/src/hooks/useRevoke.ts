import { useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import {
  buildMarkRevokedInputs,
  DEFAULT_FEE_MICROCREDITS,
  PII_CHAIN_ID,
  PII_PROGRAM_ID,
  type MarkRevokedInput,
} from "../lib/inputs";
import { describeError, usePIIStatus } from "./usePIIStatus";

export interface RevokeArgs {
  originalNonce: MarkRevokedInput["originalNonce"];
  proofRecord: MarkRevokedInput["proofRecord"];
}

export function useRevoke() {
  const { publicKey, requestTransaction } = useWallet();
  const { state, setPending, setSuccess, setFailure, reset } = usePIIStatus();

  const revoke = useCallback(
    async (args: RevokeArgs): Promise<string> => {
      if (!publicKey || !requestTransaction) {
        const msg = "Wallet not connected";
        setFailure(msg);
        throw new Error(msg);
      }
      setPending();
      try {
        const inputs = buildMarkRevokedInputs(args);
        const tx = new Transaction(
          publicKey,
          PII_CHAIN_ID,
          [
            {
              program: PII_PROGRAM_ID,
              functionName: "mark_revoked",
              inputs: [...inputs],
            },
          ],
          DEFAULT_FEE_MICROCREDITS,
          false,
        );
        const txId = await requestTransaction(tx);
        setSuccess(txId);
        return txId;
      } catch (err) {
        setFailure(describeError(err));
        throw err;
      }
    },
    [publicKey, requestTransaction, setPending, setSuccess, setFailure],
  );

  return { revoke, state, reset };
}
