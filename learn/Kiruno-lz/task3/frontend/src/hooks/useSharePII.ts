import { useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import {
  buildSharePIIInputs,
  DEFAULT_FEE_MICROCREDITS,
  PII_CHAIN_ID,
  PII_PROGRAM_ID,
  type SharePIIInput,
} from "../lib/inputs";
import { describeError, usePIIStatus } from "./usePIIStatus";
import { fetchLatestBlockHeight } from "../lib/blockHeight";

export interface SharePIIArgs {
  sourceRecord: SharePIIInput["sourceRecord"];
  recipient: string;
  expiresInBlocks: number;
  purpose: number;
  currentBlock?: number;
}

export function useSharePII() {
  const { publicKey, requestTransaction } = useWallet();
  const { state, setPending, setSuccess, setFailure, reset } = usePIIStatus();

  const share = useCallback(
    async (args: SharePIIArgs): Promise<string> => {
      if (!publicKey || !requestTransaction) {
        const msg = "Wallet not connected";
        setFailure(msg);
        throw new Error(msg);
      }
      setPending();
      try {
        const currentBlock =
          args.currentBlock ?? (await fetchLatestBlockHeight());
        const inputs = buildSharePIIInputs({
          sourceRecord: args.sourceRecord,
          recipient: args.recipient,
          expiresInBlocks: args.expiresInBlocks,
          purpose: args.purpose,
          currentBlock,
        });
        const tx = new Transaction(
          publicKey,
          PII_CHAIN_ID,
          [
            {
              program: PII_PROGRAM_ID,
              functionName: "share_pii",
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

  return { share, state, reset };
}
