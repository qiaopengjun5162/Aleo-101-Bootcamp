"use client";

import { useCallback, useEffect, useState } from "react";
import { getGateAccessCount } from "@/lib/network";

// Live per-gate public access counter. Polls so it reflects new passes
// (including ones made from this session). Pass the raw gate_id field value.
export function useGateAccessCount(gateIdRaw: string | null, pollMs = 15000) {
  const [count, setCount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!gateIdRaw) return;
    const c = await getGateAccessCount(gateIdRaw);
    setCount(c);
    setLoading(false);
  }, [gateIdRaw]);

  useEffect(() => {
    if (!gateIdRaw) return;
    refresh();
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs, gateIdRaw]);

  return { count, loading, refresh };
}
