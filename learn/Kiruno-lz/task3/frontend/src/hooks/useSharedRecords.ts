import { useCallback, useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { PII_PROGRAM_ID } from "../lib/inputs";
import { decodePIIPayload, type PIIPayloadDecoded } from "../lib/codec";
import { describeError } from "./usePIIStatus";

export interface SharedRecord {
  id: string;
  spent: boolean;
  decoded: PIIPayloadDecoded | null;
  sender?: string | undefined;
  purpose?: number | undefined;
  expiresAt?: string | undefined;
  sharedAt?: string | undefined;
  raw: Record<string, unknown>;
}

/** Read a value from `raw.data` as a trimmed string, if present. */
function readField(
  data: Record<string, unknown> | null,
  key: string,
): string | undefined {
  if (!data) return undefined;
  const value = data[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return undefined;
}

/** Strip the Aleo numeric-literal suffix (e.g. `123u128` -> 123). */
function parseCode(literal: string | undefined): number | undefined {
  if (literal === undefined) return undefined;
  const match = literal.match(/^(\d+)(?:u\d+|field)?$/);
  if (!match || match[1] === undefined) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useSharedRecords() {
  const { publicKey, requestRecordPlaintexts } = useWallet();
  const [sharedRecords, setSharedRecords] = useState<SharedRecord[]>([]);
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
      const mapped: SharedRecord[] = (all ?? [])
        .map((r: Record<string, unknown>) => ({
          r,
          recordName: typeof r.recordName === "string" ? r.recordName : "",
        }))
        .filter((entry) => entry.recordName === "SharedPIIRecord")
        .map(({ r }) => {
          const id = typeof r.id === "string" ? r.id : "";
          const spent = Boolean(r.spent);
          const data =
            r.data && typeof r.data === "object"
              ? (r.data as Record<string, unknown>)
              : null;

          let decoded: PIIPayloadDecoded | null = null;
          try {
            decoded = decodePIIPayload({
              data: data ?? {},
            } as Parameters<typeof decodePIIPayload>[0]);
          } catch {
            decoded = null;
          }

          return {
            id,
            spent,
            decoded,
            sender: readField(data, "sender"),
            purpose: parseCode(readField(data, "purpose")),
            expiresAt: readField(data, "expires_at"),
            sharedAt: readField(data, "shared_at"),
            raw: r,
          };
        });
      setSharedRecords(mapped);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [publicKey, requestRecordPlaintexts]);

  return { sharedRecords, loading, error, refresh };
}

/** Group shared records by sender address (optional helper). */
export function groupBySender(
  records: SharedRecord[],
): Map<string, SharedRecord[]> {
  const map = new Map<string, SharedRecord[]>();
  for (const record of records) {
    const key = record.sender ?? "";
    const list = map.get(key) ?? [];
    list.push(record);
    map.set(key, list);
  }
  return map;
}
