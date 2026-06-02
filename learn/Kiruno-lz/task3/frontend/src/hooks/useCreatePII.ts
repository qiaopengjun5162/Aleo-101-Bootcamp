import { useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import {
  buildCreatePIIInputs,
  DEFAULT_FEE_MICROCREDITS,
  PII_CHAIN_ID,
  PII_PROGRAM_ID,
  type CreatePIIInput,
} from "../lib/inputs";
import { describeError, usePIIStatus } from "./usePIIStatus";
import { fetchLatestBlockHeight } from "../lib/blockHeight";

export interface CreatePIIArgs {
  payload: CreatePIIInput["payload"];
  createdAt?: bigint;
}

export function useCreatePII() {
  const { publicKey, requestTransaction } = useWallet();
  const { state, setPending, setSuccess, setFailure, reset } = usePIIStatus();

  const create = useCallback(
    async (args: CreatePIIArgs): Promise<string> => {
      if (!publicKey || !requestTransaction) {
        const msg = "Wallet not connected";
        setFailure(msg);
        throw new Error(msg);
      }
      setPending();
      try {
        const createdAt =
          args.createdAt ?? BigInt(await fetchLatestBlockHeight());
        const inputs = buildCreatePIIInputs({
          payload: args.payload,
          createdAt,
        });
        const tx = new Transaction(
          publicKey,
          PII_CHAIN_ID,
          [
            {
              program: PII_PROGRAM_ID,
              functionName: "create_pii",
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

  return { create, state, reset };
}
