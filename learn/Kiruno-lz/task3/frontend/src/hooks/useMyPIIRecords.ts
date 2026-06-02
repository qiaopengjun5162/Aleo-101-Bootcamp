import { useCallback, useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { PII_PROGRAM_ID } from "../lib/inputs";
import { decodePIIPayload, type PIIPayloadDecoded } from "../lib/codec";
import { describeError } from "./usePIIStatus";

export interface MyPIIRecord {
  id: string;
  recordName: string;
  spent: boolean;
  decoded: PIIPayloadDecoded | null;
  raw: Record<string, unknown>;
}

export function useMyPIIRecords() {
  const { publicKey, requestRecordPlaintexts } = useWallet();
  const [records, setRecords] = useState<MyPIIRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !requestRecordPlaintexts) {
      setError("Wallet not connected");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await requestRecordPlaintexts(PII_PROGRAM_ID);
      const mapped: MyPIIRecord[] = (all ?? []).map(
        (r: Record<string, unknown>) => {
          const id = typeof r.id === "string" ? r.id : "";
          const recordName =
            typeof r.recordName === "string" ? r.recordName : "";
          const spent = Boolean(r.spent);
          let decoded: PIIPayloadDecoded | null = null;
          try {
            decoded = decodePIIPayload({
              data: (r.data as Record<string, unknown>) ?? {},
            } as Parameters<typeof decodePIIPayload>[0]);
          } catch {
            decoded = null;
          }
          return { id, recordName, spent, decoded, raw: r };
        },
      );
      setRecords(mapped);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [publicKey, requestRecordPlaintexts]);

  return { records, loading, error, refresh };
}
