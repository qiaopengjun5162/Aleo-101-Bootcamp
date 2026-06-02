import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { StatusBadge } from "../../components/StatusBadge";
import { useI18n } from "../../i18n";
import { useSharePII } from "../../hooks/useSharePII";
import { PURPOSES, CUSTOM_PURPOSE_MIN } from "../../constants/categories";
import { cx } from "../../lib/cx";
import type { MyPIIRecord } from "../../hooks/useMyPIIRecords";

type PurposeKey = (typeof PURPOSES)[number]["i18nKey"];

const BLOCKS_PER_DAY = 720;

type ExpiryMode = "blocks" | "days";

export function ShareDialog({
  open,
  onClose,
  record,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  record: MyPIIRecord | null;
  onShared?: () => void;
}) {
  const { t } = useI18n();
  const { share, state, reset } = useSharePII();

  const [recipient, setRecipient] = useState("");
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("blocks");
  const [expiryValue, setExpiryValue] = useState("720");
  const [purposeCode, setPurposeCode] = useState<number>(PURPOSES[0].code);
  const [customCode, setCustomCode] = useState("1000");

  const isCustom = purposeCode >= CUSTOM_PURPOSE_MIN;
  const pending = state.status === "pending";

  const expiresInBlocks = useMemo(() => {
    const raw = Number(expiryValue);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    const value = expiryMode === "days" ? raw * BLOCKS_PER_DAY : raw;
    return Math.floor(value);
  }, [expiryValue, expiryMode]);

  const effectivePurpose = useMemo(() => {
    if (!isCustom) return purposeCode;
    const raw = Number(customCode);
    return Number.isFinite(raw) ? Math.floor(raw) : 0;
  }, [isCustom, purposeCode, customCode]);

  const recipientValid = recipient.startsWith("aleo1");
  const purposeValid =
    (effectivePurpose >= 1 && effectivePurpose <= 4) ||
    effectivePurpose >= CUSTOM_PURPOSE_MIN;
  const valid =
    recipientValid && expiresInBlocks > 0 && purposeValid && record !== null;

  const close = () => {
    reset();
    setRecipient("");
    setExpiryMode("blocks");
    setExpiryValue("720");
    setPurposeCode(PURPOSES[0].code);
    setCustomCode("1000");
    onClose();
  };

  const handleConfirm = async () => {
    if (!valid || !record) return;
    try {
      await share({
        sourceRecord: { id: record.id },
        recipient,
        expiresInBlocks,
        purpose: effectivePurpose,
      });
      onShared?.();
      close();
    } catch {
      // failure surfaced via StatusBadge
    }
  };

  const inputClass =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
  const labelClass =
    "block text-xs font-medium text-[var(--text-secondary)] mb-1";

  return (
    <Modal
      open={open}
      onClose={close}
      title={t.share.title}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
          >
            {t.share.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!valid || pending}
            className={cx(
              "rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-[var(--bg-primary)]",
              (!valid || pending) && "cursor-not-allowed opacity-50",
            )}
          >
            {t.share.confirm}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="share-recipient">
            {t.share.recipient}
          </label>
          <input
            id="share-recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="aleo1..."
            className={cx(
              inputClass,
              recipient.length > 0 &&
                !recipientValid &&
                "border-[var(--danger)]",
            )}
            spellCheck={false}
          />
        </div>

        <div>
          <span className={labelClass}>{t.share.expiryMode}</span>
          <div className="flex gap-2">
            {(["blocks", "days"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setExpiryMode(mode)}
                className={cx(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm",
                  expiryMode === mode
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]",
                )}
              >
                {mode === "blocks" ? t.share.blockCount : t.share.days}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="share-expiry">
            {expiryMode === "blocks" ? t.share.blockCount : t.share.days}
          </label>
          <input
            id="share-expiry"
            type="number"
            min={1}
            value={expiryValue}
            onChange={(e) => setExpiryValue(e.target.value)}
            className={inputClass}
          />
          {expiryMode === "days" && expiresInBlocks > 0 ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              ≈ {expiresInBlocks} {t.share.blockCount}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="share-purpose">
            {t.share.purpose}
          </label>
          <select
            id="share-purpose"
            value={purposeCode}
            onChange={(e) => setPurposeCode(Number(e.target.value))}
            className={inputClass}
          >
            {PURPOSES.map((p) => (
              <option key={p.code} value={p.code}>
                {t.share.purposes[p.i18nKey as PurposeKey]}
              </option>
            ))}
          </select>
        </div>

        {isCustom ? (
          <div>
            <label className={labelClass} htmlFor="share-custom-code">
              {t.share.purposes.custom}
            </label>
            <input
              id="share-custom-code"
              type="number"
              min={CUSTOM_PURPOSE_MIN}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className={cx(
                inputClass,
                !purposeValid && "border-[var(--danger)]",
              )}
            />
          </div>
        ) : null}

        {state.status !== "idle" ? <StatusBadge state={state} /> : null}
      </div>
    </Modal>
  );
}
