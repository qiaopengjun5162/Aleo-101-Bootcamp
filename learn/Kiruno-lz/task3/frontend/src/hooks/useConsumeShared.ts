import { useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import {
  buildConsumeSharedInputs,
  DEFAULT_FEE_MICROCREDITS,
  PII_CHAIN_ID,
  PII_PROGRAM_ID,
  type ConsumeSharedInput,
} from "../lib/inputs";
import { describeError, usePIIStatus } from "./usePIIStatus";

export interface ConsumeSharedArgs {
  sharedRecord: ConsumeSharedInput["sharedRecord"];
}

export function useConsumeShared() {
  const { publicKey, requestTransaction } = useWallet();
  const { state, setPending, setSuccess, setFailure, reset } = usePIIStatus();

  const consume = useCallback(
    async (args: ConsumeSharedArgs): Promise<string> => {
      if (!publicKey || !requestTransaction) {
        const msg = "Wallet not connected";
        setFailure(msg);
        throw new Error(msg);
      }
      setPending();
      try {
        const inputs = buildConsumeSharedInputs(args);
        const tx = new Transaction(
          publicKey,
          PII_CHAIN_ID,
          [
            {
              program: PII_PROGRAM_ID,
              functionName: "consume_shared",
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

  return { consume, state, reset };
}
