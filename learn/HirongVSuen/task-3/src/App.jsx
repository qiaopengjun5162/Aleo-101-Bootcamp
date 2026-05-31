import { useState } from "react";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import age_verify_program from "../age_verify/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker.js";

const aleoWorker = AleoWorker();
const ADULT_THRESHOLD = 18;

function App() {
    const [age, setAge] = useState("");
    const [zkpResult, setZkpResult] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [proofIsValid, setProofIsValid] = useState(null);

    // Prover (左边输入者): 输入年龄，生成ZKP证明
    const handleGenerateProof = async () => {
        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 255) {
            alert("请输入有效的年龄 (0-255)");
            return;
        }

        setExecuting(true);
        setZkpResult(null);
        setProofIsValid(null);

        try {
            const result = await aleoWorker.localProgramExecution(
                age_verify_program,
                "verify_age",
                [`${ageNum}u8`, `${ADULT_THRESHOLD}u8`],
            );
            setZkpResult(result);
        } catch (e) {
            console.error("Proof generation error:", e);
            alert("证明生成失败，请查看控制台");
        }
        setExecuting(false);
    };

    // Verifier (右边验证者): 验证ZKP证明
    const handleVerify = async () => {
        if (!zkpResult || zkpResult.length === 0) {
            alert("请先生成ZKP证明");
            return;
        }

        setVerifying(true);
        setProofIsValid(null);

        try {
            const blockHeight = 9000000;
            const isValid = await aleoWorker.verifyExecutionProof(blockHeight);
            setProofIsValid(isValid);
        } catch (e) {
            console.error("Proof verification error:", e);
            alert("证明验证失败，请查看控制台");
        }
        setVerifying(false);
    };

    const isAdult = zkpResult ? zkpResult[0] : null;

    return (
        <>
            {/* Header */}
            <div>
                <a href="https://provable.com" target="_blank" rel="noreferrer">
                    <img src={aleoLogo} className="logo" alt="Aleo logo" />
                </a>
            </div>
            <h1>年龄是否成年验证</h1>

            {/* Feature Description */}
            <div className="card intro-card">
                <h2>功能介绍</h2>
                <p className="intro-text">
                    本功能利用零知识证明（ZKP）技术，在不暴露真实年龄的情况下验证一个人是否已成年（≥{" "}
                    {ADULT_THRESHOLD} 岁）。
                    输入者只需输入年龄生成证明，验证者通过验证该证明即可知晓结果，全程不会泄露实际年龄数据。
                </p>
            </div>

            {/* ZKP Value Display — 只展示是否成年 */}
            <div className="card zkp-card">
                <h2>ZKP 证明值</h2>
                {isAdult !== null ? (
                    <div
                        className={`zkp-result-badge ${isAdult ? "adult" : "minor"}`}
                    >
                        <span className="result-icon">
                            {isAdult ? "✅" : "🔞"}
                        </span>
                        <span className="result-text">
                            {isAdult
                                ? `已成年（≥${ADULT_THRESHOLD}岁）`
                                : `未成年（<${ADULT_THRESHOLD}岁）`}
                        </span>
                    </div>
                ) : (
                    <p className="zkp-placeholder">
                        尚未生成证明，请在左侧输入年龄后点击"生成证明"
                    </p>
                )}
            </div>

            {/* Main: Left Prover / Right Verifier */}
            <div className="main-section">
                {/* Left: Prover (输入者) */}
                <div className="card prover-card">
                    <h2>🔑 输入者</h2>
                    <p className="role-desc">输入年龄并生成零知识证明</p>
                    <div className="input-group">
                        <label htmlFor="age-input">年龄：</label>
                        <input
                            id="age-input"
                            type="number"
                            min="0"
                            max="255"
                            placeholder="请输入年龄"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            disabled={executing}
                            className="age-input"
                        />
                    </div>
                    <button
                        className="btn-primary"
                        disabled={executing}
                        onClick={handleGenerateProof}
                    >
                        {executing ? "正在生成证明..." : "生成证明"}
                    </button>
                </div>

                {/* Right: Verifier (验证者) */}
                <div className="card verifier-card">
                    <h2>🔍 验证者</h2>
                    <p className="role-desc">验证零知识证明是否有效</p>
                    <div className="verify-section">
                        <button
                            className="btn-primary"
                            onClick={handleVerify}
                            disabled={!zkpResult || verifying}
                        >
                            {verifying ? "正在验证证明..." : "验证证明"}
                        </button>
                        {proofIsValid !== null && (
                            <div
                                className={`verify-result ${proofIsValid ? "valid" : "invalid"}`}
                            >
                                <span className="result-icon">
                                    {proofIsValid ? "✅" : "❌"}
                                </span>
                                <span className="result-text">
                                    {proofIsValid ? "证明有效" : "证明无效"}
                                </span>
                            </div>
                        )}
                        {proofIsValid === null && zkpResult && !verifying && (
                            <p className="verify-hint">
                                证明已生成，点击上方按钮验证
                            </p>
                        )}
                    </div>
                    {zkpResult && (
                        <div className="zkp-detail">
                            <p className="detail-title">证明详情：</p>
                            <p>
                                输入者已提供有效证明，证明其年龄 ≥{" "}
                                {ADULT_THRESHOLD} 岁
                            </p>
                            <p className="privacy-note">
                                🔒 零知识属性：验证者无法获知输入者的真实年龄
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <p className="read-the-docs">
                基于 Aleo 零知识证明技术构建 | proveExecution + verifyExecution
            </p>
        </>
    );
}

export default App;
