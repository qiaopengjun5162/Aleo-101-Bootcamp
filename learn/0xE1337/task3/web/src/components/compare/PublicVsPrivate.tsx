import styles from "./PublicVsPrivate.module.css";

type Row = { dim: string; normal: string; gate: string; shared?: boolean };

const ROWS: Row[] = [
  { dim: "你是谁", normal: "出示证件 / 登录 → 身份明示", gate: "owner 加密在 record 内" },
  { dim: "你的等级", normal: "完整等级可见", gate: "只知道「≥ 门槛」" },
  { dim: "凭证细节(过期等)", normal: "全部出示", gate: "永不离开你的钱包" },
  { dim: "两次到访是否同一人", normal: "可关联(同一账号)", gate: "不可关联(每次 nullifier 不同)" },
  { dim: "是否合法会员", normal: "公开", gate: "公开", shared: true },
  { dim: "该门禁累计通行数", normal: "公开", gate: "公开", shared: true },
];

export function PublicVsPrivate() {
  return (
    <section className="section" id="why">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">为什么是 Aleo</span>
          <h2>
            门禁本来要看你的<span className={styles.accent}>一切</span>。
            <br />
            这里它<span className={styles.accent}>只</span>知道「够格」。
          </h2>
          <p className="lede">
            普通门禁(出示证件 / 登录 / 链上签名)会暴露你的身份、等级、和每一次到访的关联；
            gate-pass 让门禁只学到一个布尔事实，再加一个匿名计数。
          </p>
        </div>

        <div className={styles.compare} role="table">
          <div className={`${styles.row} ${styles.headRow}`} role="row">
            <div className={styles.dim} role="columnheader">
              门禁能学到什么
            </div>
            <div className={`${styles.cell} ${styles.exposedHead}`} role="columnheader">
              <span className="tag tag--exposed">普通门禁 · 全部可见</span>
            </div>
            <div className={`${styles.cell} ${styles.privateHead}`} role="columnheader">
              <span className="tag tag--private">gate-pass · 只知够格</span>
            </div>
          </div>

          {ROWS.map((r) => (
            <div className={styles.row} role="row" key={r.dim}>
              <div className={styles.dim} role="cell">
                {r.dim}
              </div>
              <div
                className={`${styles.cell} ${r.shared ? styles.shared : styles.exposed}`}
                role="cell"
              >
                <span className={styles.mark} aria-hidden>
                  {r.shared ? "=" : "○"}
                </span>
                {r.normal}
              </div>
              <div
                className={`${styles.cell} ${r.shared ? styles.shared : styles.private}`}
                role="cell"
              >
                <span className={styles.mark} aria-hidden>
                  {r.shared ? "=" : "●"}
                </span>
                {r.gate}
              </div>
            </div>
          ))}
        </div>

        <p className={styles.foot}>
          核心是<strong> 选择性披露</strong>：`tier ≥ N` 的比较发生在私密 transition 里，
          链上只留下「通过」这一事实 <em>且</em> 一个跨门禁/跨周期不可关联的 nullifier。
        </p>
      </div>
    </section>
  );
}
