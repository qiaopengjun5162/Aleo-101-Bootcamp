import type { JSX } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import { useI18n } from "../../i18n";

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletStatus(): JSX.Element {
  const { publicKey, connected, disconnect } = useWallet();
  const { t } = useI18n();

  if (!connected || !publicKey) {
    return <WalletMultiButton />;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] py-1 pl-3 pr-1 text-sm text-[var(--text-primary)]">
      <code className="font-mono">{truncateAddress(publicKey)}</code>
      <button
        type="button"
        onClick={() => {
          void disconnect();
        }}
        className="rounded-full px-2 py-0.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-card)] hover:text-[var(--danger)]"
      >
        {t.wallet.disconnect}
      </button>
    </span>
  );
}
