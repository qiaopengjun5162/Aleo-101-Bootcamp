import { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import aleoProgram from "../helloworld/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker.js";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";

const aleoWorker = AleoWorker();

// 年龄限制固定为 18（公开参数）
const AGE_LIMIT = 18;

// Leo Wallet requestTransaction 的 fee 按 microcredits 传入。
// 100_000 microcredits = 0.1 credit；低于实际成本时钱包会先 Completed 再 Failed。
const EXECUTION_FEE = 100_000;

// 已部署到 Testnet 的程序 ID
const PROGRAM_ID = "yao990x16_age_verifier.aleo";

// Aleo Explorer 链接
const EXPLORER_URL = "https://explorer.provable.com";

function App() {
  const [mode, setMode] = useState("local"); // "local" or "onchain"
  const [age, setAge] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 链上执行状态
  const [txId, setTxId] = useState(null);
  const [txStatus, setTxStatus] = useState(null); // "pending", "completed", "failed", "timeout"
  const [txStatusDetail, setTxStatusDetail] = useState(null);

  // 钱包状态与方法
  const { publicKey, connected, executeTransaction, transactionStatus } = useWallet();
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleReset = useCallback(() => {
    setAge("");
    setResult(null);
    setError(null);
    setTxId(null);
    setTxStatus(null);
    setTxStatusDetail(null);
    setExecuting(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }, []);

  const startPolling = (transactionId) => {
    let attempts = 0;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const statusResponse = await transactionStatus(transactionId);
        const rawLeoStatus = await window.leoWallet?.transactionStatus?.(transactionId)
          ?? await window.leo?.transactionStatus?.(transactionId)
          ?? null;
        const detail = {
          adapter: statusResponse,
          leoWallet: rawLeoStatus,
        };
        setTxStatusDetail(detail);

        const s = typeof statusResponse === "object" ? statusResponse.status : statusResponse;
        const normalizedStatus = s?.toLowerCase() || "";

        if (normalizedStatus === "accepted" || normalizedStatus === "completed" || normalizedStatus === "finalized") {
          setTxStatus("completed");
          setExecuting(false);
          clearInterval(pollIntervalRef.current);
        } else if (normalizedStatus === "failed" || normalizedStatus === "rejected") {
          setTxStatus("failed");
          setExecuting(false);
          clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }

      if (attempts >= 100) { // 增加轮询次数到 100（5分钟），应对 Testnet 拥堵
        setTxStatus("timeout");
        setExecuting(false);
        clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  const isShieldInternalTransactionId = (transactionId) => (
    typeof transactionId === "string" && transactionId.startsWith("shield_")
  );

  const handleVerify = async () => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 255) {
      setError("请输入 0 ~ 255 之间的整数年龄。");
      return;
    }

    setError(null);
    setResult(null);
    setTxId(null);
    setTxStatus(null);
    setTxStatusDetail(null);
    setExecuting(true);

    try {
      if (mode === "local") {
        // 本地执行：浏览器本地生成 ZK 证明
        const outputs = await aleoWorker.localProgramExecution(
          aleoProgram,
          "verify_age",
          [`${ageNum}u8`, `${AGE_LIMIT}u8`]
        );
        const passed = outputs[0] === "true";
        setResult({ passed, age: ageNum, mode: "local" });
        setExecuting(false);
      } else {
        // 链上执行
        if (!connected) {
          throw new Error("请先在页面顶部连接钱包！");
        }

        const tx = await executeTransaction({
          program: PROGRAM_ID,
          function: "verify_age",
          inputs: [`${ageNum}u8`, `${AGE_LIMIT}u8`],
          fee: EXECUTION_FEE,
          privateFee: false, // 改回 false，使用公开余额支付手续费（水龙头通常发放公开余额）
        });
        if (tx && tx.transactionId) {
          setTxId(tx.transactionId);
          setResult({ age: ageNum, mode: "onchain" });

          if (isShieldInternalTransactionId(tx.transactionId)) {
            setTxStatus("wallet_failed");
            setTxStatusDetail({
              walletTransactionId: tx.transactionId,
              reason: "Shield Wallet 返回的是内部请求 ID，不是 Aleo 链上交易 ID。Shield 当前在 JWT/CORS 阶段失败，交易没有广播到 Testnet。",
            });
            setExecuting(false);
            return;
          }

          setTxStatus("pending");
          startPolling(tx.transactionId);
        } else {
          throw new Error("未能获取到交易 ID，可能钱包签名被拒绝。");
        }
      }
    } catch (e) {
      const errMsg = e?.message || String(e);
      setError(`执行失败: ${errMsg}`);
      setExecuting(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  };

  const truncateAddress = (addr) => {
    if (!addr) return "";
    const str = typeof addr === "string" ? addr : String(addr);
    return str.length > 16 ? `${str.slice(0, 8)}...${str.slice(-6)}` : str;
  };

  const formatStatusDetail = (detail) => {
    if (!detail) return "暂无钱包返回详情，请打开浏览器控制台查看 Aleo transaction status 日志。";
    try {
      return JSON.stringify(detail, null, 2);
    } catch {
      return String(detail);
    }
  };

  const renderLocalResult = () => (
    <div className={`result-section ${result.passed ? "passed" : "failed"}`}>
      <div className="result-icon">
        {result.passed ? "🎉" : "🚫"}
      </div>
      <h2 className="result-title">
        {result.passed ? "验证通过！" : "验证未通过"}
      </h2>
      <p className="result-desc">
        {result.passed
          ? `零知识证明已生成。逻辑判断满足 ${AGE_LIMIT} 岁的要求，但您的真实年龄 ${result.age} 岁从未离开您的设备。`
          : `证明显示您未能满足 ${AGE_LIMIT} 岁的年龄要求。具体数值并未公开。`}
      </p>

      <div className="proof-meta">
        <div className="proof-item">
          <span className="proof-label">输入（Private）</span>
          <span className="proof-value censored">██ 岁（已加密隐藏）</span>
        </div>
        <div className="proof-item">
          <span className="proof-label">门槛（Public）</span>
          <span className="proof-value">{AGE_LIMIT} 岁</span>
        </div>
        <div className="proof-item">
          <span className="proof-label">本地输出</span>
          <span className={`proof-value ${result.passed ? "text-green" : "text-red"}`}>
            {result.passed ? "true ✅" : "false ❌"}
          </span>
        </div>
        <div className="proof-item">
          <span className="proof-label">执行方式</span>
          <span className="proof-value">本地零知识证明（Local Execution）</span>
        </div>
        <div className="proof-item">
          <span className="proof-label">合约地址</span>
          <a
            className="proof-value tx-link"
            href={`${EXPLORER_URL}/program/${PROGRAM_ID}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {PROGRAM_ID} ↗
          </a>
        </div>
      </div>

      <button id="reset-btn" className="reset-btn" onClick={handleReset}>
        ← 重新验证
      </button>
    </div>
  );

  const renderOnChainResult = () => {
    if (txStatus === "pending") {
      return (
        <div className="result-section onchain">
          <div className="result-icon">⏳</div>
          <h2 className="result-title" style={{ color: "#00cfff" }}>交易确认中...</h2>
          <p className="result-desc">
            您的交易已广播至 Aleo Testnet。由于节点打包需要时间，系统正在每 3 秒轮询一次状态，请稍候。
          </p>
          <div className="proof-meta">
            <div className="proof-item">
              <span className="proof-label">交易 ID</span>
              <a 
                className="proof-value tx-link" 
                style={{ fontSize: "0.75rem", fontFamily: "monospace" }} 
                href={`${EXPLORER_URL}/transaction/${txId}?network=testnet`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {truncateAddress(txId)} ↗
              </a>
            </div>
            <div className="proof-item">
              <span className="proof-label">状态</span>
              <span className="proof-value" style={{ color: "#ffc107", fontWeight: "bold" }}>Pending (轮询中)</span>
            </div>
          </div>
          <button id="reset-btn" className="reset-btn" onClick={handleReset}>← 返回重试</button>
        </div>
      );
    }

    if (txStatus === "completed") {
      return (
        <div className="result-section passed">
          <div className="result-icon">🎉</div>
          <h2 className="result-title">链上验证成功！</h2>
          <p className="result-desc">
            交易已被 Aleo 网络确认。您的年龄证明已经永久且匿名地记录在链上！
          </p>
          <div className="proof-meta">
            <div className="proof-item">
              <span className="proof-label">交易 ID</span>
              <a 
                className="proof-value tx-link" 
                style={{ fontSize: "0.75rem", fontFamily: "monospace" }} 
                href={`${EXPLORER_URL}/transaction/${txId}?network=testnet`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {truncateAddress(txId)} ↗
              </a>
            </div>
            <div className="proof-item">
              <span className="proof-label">执行状态</span>
              <span className="proof-value text-green">Confirmed ✅</span>
            </div>
          </div>
          <button id="reset-btn" className="reset-btn" onClick={handleReset}>← 重新验证</button>
        </div>
      );
    }

    if (txStatus === "failed" || txStatus === "timeout" || txStatus === "wallet_failed") {
      const isWalletFailure = txStatus === "wallet_failed";
      return (
        <div className="result-section failed">
          <div className="result-icon">🚫</div>
          <h2 className="result-title">
            {isWalletFailure ? "钱包提交失败" : "链上执行失败 / 超时"}
          </h2>
          <p className="result-desc">
            {isWalletFailure
              ? "钱包没有返回 Aleo 链上交易 ID，说明交易尚未广播。Shield Wallet 当前卡在 Provable JWT/CORS 阶段，这不是合约执行失败。"
              : "钱包或链上节点返回了失败状态。年龄小于门槛只会返回 false，通常不应导致交易失败；请优先查看下面的钱包原始状态。"}
          </p>
          <div className="proof-meta">
            <div className="proof-item">
              <span className="proof-label">交易 ID</span>
              <a 
                className="proof-value tx-link" 
                style={{ fontSize: "0.75rem", fontFamily: "monospace" }} 
                href={`${EXPLORER_URL}/transaction/${txId}?network=testnet`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {truncateAddress(txId)} ↗
              </a>
            </div>
            <div className="proof-item">
              <span className="proof-label">最终状态</span>
              <span className="proof-value text-red">{txStatus.toUpperCase()} ❌</span>
            </div>
            <div className="proof-item" style={{ alignItems: "flex-start" }}>
              <span className="proof-label">钱包状态详情</span>
              <pre
                className="proof-value"
                style={{
                  maxWidth: "100%",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  lineHeight: 1.5,
                }}
              >
                {formatStatusDetail(txStatusDetail)}
              </pre>
            </div>
          </div>
          <button id="reset-btn" className="reset-btn" onClick={handleReset}>← 重新验证</button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="app-container">
      {/* 背景粒子装饰 */}
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <div className="card-wrapper">
        {/* 钱包连接区域 */}
        <div className="wallet-bar">
          <div className="wallet-status">
            <span className={`status-dot ${connected ? "online" : ""}`} />
            <span className="status-text">
              {connected
                ? truncateAddress(publicKey)
                : "未连接钱包"}
            </span>
          </div>
          <WalletMultiButton className="wallet-connect-btn" />
        </div>

        {/* 页面标题 */}
        <header className="header">
          <div className="logo-row">
            <span className="logo-badge">🔐</span>
            <span className="logo-badge aleo-badge">Aleo</span>
            <span className="logo-badge testnet-badge">Testnet</span>
          </div>
          <h1 className="title">隐私年龄验证器</h1>
          <p className="subtitle">
            基于零知识证明 · 证明您已达标 · 无需透露真实年龄
          </p>
        </header>

        {/* 合约信息 */}
        <div className="contract-info">
          <span>📋 合约已部署：</span>
          <a
            href={`${EXPLORER_URL}/program/${PROGRAM_ID}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="contract-link"
          >
            {PROGRAM_ID} ↗
          </a>
        </div>

        {/* 主输入区域 */}
        {result === null ? (
          <div className="input-section">
            
            {/* 模式切换 */}
            <div className="mode-tabs" style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <button 
                className={`mode-tab ${mode === "local" ? "active" : ""}`} 
                onClick={() => { setMode("local"); handleReset(); }}
                disabled={executing}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", border: mode === "local" ? "1px solid #6c63ff" : "1px solid transparent", background: mode === "local" ? "rgba(108, 99, 255, 0.2)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer" }}
              >
                💻 本地生成证明
              </button>
              <button 
                className={`mode-tab ${mode === "onchain" ? "active" : ""}`} 
                onClick={() => { setMode("onchain"); handleReset(); }}
                disabled={executing}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", border: mode === "onchain" ? "1px solid #00cfff" : "1px solid transparent", background: mode === "onchain" ? "rgba(0, 207, 255, 0.2)" : "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer" }}
              >
                🌐 链上广播执行
              </button>
            </div>
            
            <label className="input-label" htmlFor="age-input">
              请输入您的年龄
              <span className="private-tag">🔒 Private Data</span>
            </label>
            <div className="input-row">
              <input
                id="age-input"
                type="number"
                min="0"
                max="255"
                className="age-input"
                placeholder="例如：20"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !executing && handleVerify()}
                disabled={executing}
              />
            </div>

            <div className="limit-display">
              <span>验证门槛：</span>
              <span className="limit-value">{AGE_LIMIT} 岁</span>
              <span className="public-tag">📢 Public</span>
            </div>

            {error && <div className="error-msg">⚠️ {error}</div>}

            <button
              id="verify-btn"
              className={`verify-btn ${executing ? "loading" : ""}`}
              onClick={handleVerify}
              disabled={executing || age === ""}
            >
              {executing ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "10px" }}>
                    <span className="spinner" />
                  </div>
                  <span style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    {mode === "local" ? "正在生成零知识证明..." : "等待钱包签名或链上确认..."}
                  </span>
                  <div />
                </div>
              ) : (
                <span>
                  {mode === "local" ? "⚡ 生成 ZK 证明并验证 (免费)" : "🔗 唤起钱包签名并链上验证"}
                </span>
              )}
            </button>

            {executing && mode === "local" && (
              <p className="executing-hint">
                Aleo SDK 正在您的浏览器本地生成证明，这可能需要 10~30 秒，请耐心等待...
              </p>
            )}
          </div>
        ) : (
          /* 结果展示区域 */
          result.mode === "local" ? renderLocalResult() : renderOnChainResult()
        )}
      </div>

      <footer className="page-footer">
        Author: <strong>Yao990x16</strong> |{" "}
        Aleo 101 Bootcamp — Task 4
      </footer>
    </div>
  );
}

export default App;
