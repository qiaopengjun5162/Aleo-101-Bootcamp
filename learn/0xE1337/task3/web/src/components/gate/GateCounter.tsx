"use client";

import { useEffect, useState } from "react";
import { nameToField } from "@/lib/field";
import { DEMO_GATE_NAME } from "@/lib/constants";
import { useGateAccessCount } from "@/hooks/useGateAccessCount";
import styles from "./GateCounter.module.css";

export function GateCounter() {
  const [gateId, setGateId] = useState<string | null>(null);
  useEffect(() => {
    nameToField(DEMO_GATE_NAME).then(setGateId);
  }, []);
  const { count, loading } = useGateAccessCount(gateId);
  const display =
    loading && count === null ? "—" : count !== null ? count.toString() : "·";

  return (
    <div className={styles.stat}>
      <div className={styles.row}>
        <span className="dot" />
        <span className={styles.live}>live · testnet</span>
      </div>
      <div className={`mono ${styles.num}`}>{display}</div>
      <div className={styles.label}>
        「{DEMO_GATE_NAME}」累计通行数
        <span className="mono"> gate_access_count</span>
      </div>
      <div className={styles.hint}>
        ↑ 这是该门禁链上<strong>唯一</strong>可读的数字。每个通行者是谁、几级、是否同一人——全部不可见。
      </div>
    </div>
  );
}
