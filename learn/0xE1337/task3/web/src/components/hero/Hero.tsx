import { PROGRAM_ID, EXPLORER_PROGRAM } from "@/lib/constants";
import { GateCounter } from "@/components/gate/GateCounter";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} id="top">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <span className="eyebrow">Anonymous credential · Aleo</span>
          <h1 className={styles.title}>
            证明你
            <span className={`display ${styles.em}`}>有资格</span>
            <br />
            却<span className={styles.strike}>不暴露</span>
            你是谁
          </h1>
          <p className={styles.lede}>
            持一张私密凭证，向门禁证明「我是某发证方的<strong> tier≥N </strong>会员、未过期」——
            <em>不泄露身份、具体等级，也无法把两次到访关联到你。</em>
          </p>
          <p className={styles.why}>
            去掉隐私它就退化成「公开会员名单 + 签名验证」，任何链都能做。Aleo
            的不可替代在于：门禁<strong> 只 </strong>学到「有个合法会员过了」。
          </p>
          <div className={styles.cta}>
            <a href="#issue" className="btn btn--primary">
              领一张凭证 →
            </a>
            <a
              href={`${EXPLORER_PROGRAM}/${PROGRAM_ID}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost"
            >
              查看链上程序 ↗
            </a>
          </div>
        </div>

        <aside className={`panel panel--accent ${styles.vault}`}>
          <GateCounter />
        </aside>
      </div>
    </section>
  );
}
