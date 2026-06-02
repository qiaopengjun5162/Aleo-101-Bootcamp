import { WalletButton } from "@/components/wallet/WalletButton";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <a href="#top" className={styles.brand}>
          <span className={styles.mark}>🎟️</span>
          <span className={styles.word}>Private Gate Pass</span>
        </a>
        <div className={styles.right}>
          <span className="tag">
            <span className="dot" /> testnet
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
