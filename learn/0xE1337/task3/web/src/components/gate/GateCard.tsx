"use client";

import { useEffect, useState } from "react";
import { nameToField } from "@/lib/field";
import { useGateAccessCount } from "@/hooks/useGateAccessCount";
import type { Gate } from "@/lib/constants";
import styles from "./GateCard.module.css";

export function GateCard({
  gate,
  selected,
  onSelect,
  credTier,
  bump = 0,
}: {
  gate: Gate;
  selected: boolean;
  onSelect: () => void;
  credTier: number | null;
  bump?: number;
}) {
  const [gateId, setGateId] = useState<string | null>(null);
  useEffect(() => {
    nameToField(gate.name).then(setGateId);
  }, [gate.name]);
  const { count } = useGateAccessCount(gateId, 20000);

  const known = credTier != null;
  const eligible = known && credTier >= gate.minTier;
  const shown =
    count != null
      ? (count + BigInt(bump)).toString()
      : bump > 0
        ? String(bump)
        : "—";

  return (
    <button
      className={`${styles.card} ${selected ? styles.sel : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.emoji}>{gate.emoji}</span>
      <span className={styles.name}>{gate.name}</span>
      <span className={styles.req}>
        需 tier ≥ {gate.minTier} · {gate.blurb}
      </span>
      <span className={styles.foot}>
        <span className={styles.count}>
          通行 <b>{shown}</b>
        </span>
        {known && (
          <span className={eligible ? styles.ok : styles.no}>
            {eligible ? "✓ 够格" : "不够格"}
          </span>
        )}
      </span>
    </button>
  );
}
