import { PROGRAM_ID, EXPLORER_PROGRAM } from "@/lib/constants";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.note}>
          提供<strong> 状态级 </strong>(地址↔凭证)不可关联，<em>非网络级</em>
          匿名——fee 付费方、交易时序、IP 仍可被相关。发证在本 demo 不做访问控制
          (任何人可签发)，真实场景应限制授权发证方。诚实地说，这是把一个隐私原语演示清楚。
        </p>
        <div className={styles.links}>
          <a
            href={`${EXPLORER_PROGRAM}/${PROGRAM_ID}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
          >
            {PROGRAM_ID} ↗
          </a>
          <span className={`mono ${styles.sig}`}>
            Aleo · OpenBuild 101 · Task 3
          </span>
        </div>
      </div>
    </footer>
  );
}
