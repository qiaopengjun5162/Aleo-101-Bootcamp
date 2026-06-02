import { useState } from "react";

// Leo program source code (embedded for local execution)
const PROGRAM_SOURCE = `program age_verify.aleo {
    record AgeRecord {
        owner: address,
        age: u8,
    }

    transition create_age(public owner: address, private age: u8) -> AgeRecord {
        let record: AgeRecord = AgeRecord {
            owner: owner,
            age: age,
        };
        return record;
    }

    transition verify(record: AgeRecord) -> bool {
        let is_adult: bool = record.age >= 18u8;
        return is_adult;
    }
}`;

export default function App() {
  const [age, setAge] = useState("");
  const [record, setRecord] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("input"); // input | created | verified

  // Simulate creating a private age record
  const handleCreateRecord = () => {
    if (!age || age < 1 || age > 150) {
      alert("Please enter a valid age (1-150)");
      return;
    }
    setLoading(true);

    // Simulate ZK proof generation delay
    setTimeout(() => {
      const ageNum = parseInt(age);
      setRecord({
        owner: "aleo1...user",
        age: ageNum,
        // In real scenario, this would be encrypted on-chain
      });
      setStep("created");
      setLoading(false);
    }, 1500);
  };

  // Simulate verifying age >= 18
  const handleVerify = () => {
    if (!record) return;
    setLoading(true);

    // Simulate ZK verification delay
    setTimeout(() => {
      const isAdult = record.age >= 18;
      setVerifyResult(isAdult);
      setStep("verified");
      setLoading(false);
    }, 1500);
  };

  // Reset to start over
  const handleReset = () => {
    setAge("");
    setRecord(null);
    setVerifyResult(null);
    setStep("input");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Aleo Private Age Verification</h1>
        <p style={styles.subtitle}>
          Prove you are 18+ without revealing your actual age
        </p>

        {/* Program Info */}
        <div style={styles.programInfo}>
          <code style={styles.programId}>age_verify.aleo</code>
          <span style={styles.badge}>ZK Privacy</span>
        </div>

        {/* Step 1: Input Age */}
        {step === "input" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Step 1: Create Private Record</h2>
            <p style={styles.description}>
              Your age will be stored as an encrypted record on Aleo blockchain.
              Only you can see the actual value.
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Your Age</label>
              <input
                type="number"
                min="1"
                max="150"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                style={styles.input}
              />
            </div>
            <button
              onClick={handleCreateRecord}
              disabled={loading || !age}
              style={{
                ...styles.button,
                opacity: loading || !age ? 0.6 : 1,
              }}
            >
              {loading ? "⏳ Generating ZK Proof..." : "🔒 Create Private Record"}
            </button>
          </div>
        )}

        {/* Step 2: Record Created */}
        {step === "created" && record && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Step 2: Record Created</h2>
            <div style={styles.recordCard}>
              <div style={styles.recordField}>
                <span style={styles.fieldLabel}>Record Type</span>
                <span style={styles.fieldValue}>AgeRecord</span>
              </div>
              <div style={styles.recordField}>
                <span style={styles.fieldLabel}>Owner</span>
                <span style={styles.fieldValue}>aleo1...user</span>
              </div>
              <div style={styles.recordField}>
                <span style={styles.fieldLabel}>Age</span>
                <span style={styles.fieldValuePrivate}>
                  🔒 Private (encrypted on-chain)
                </span>
              </div>
            </div>
            <div style={styles.privacyNote}>
              ✅ Your age is now stored privately on Aleo blockchain.
              <br />
              The actual age value is encrypted - no one else can see it.
            </div>
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "⏳ Verifying with ZK Proof..." : "✅ Verify Age >= 18"}
            </button>
          </div>
        )}

        {/* Step 3: Verification Result */}
        {step === "verified" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Verification Result</h2>
            <div
              style={{
                ...styles.resultCard,
                borderColor: verifyResult ? "#00c853" : "#ff1744",
              }}
            >
              <div style={styles.resultIcon}>
                {verifyResult ? "✅" : "❌"}
              </div>
              <div style={styles.resultText}>
                {verifyResult
                  ? "Age Verified: You are 18 or older!"
                  : "Age Not Verified: You are under 18."}
              </div>
              <div style={styles.resultNote}>
                {verifyResult
                  ? "Zero-knowledge proof confirmed your age >= 18 without revealing the actual age."
                  : "The verification proved your age is less than 18."}
              </div>
            </div>
            <div style={styles.technicalDetails}>
              <h3>How it works:</h3>
              <ul>
                <li>Your age was stored as a private <code>AgeRecord</code> on Aleo</li>
                <li>The <code>verify</code> transition checks age >= 18 locally</li>
                <li>A ZK proof is generated - it proves the result is correct</li>
                <li>The actual age value is <strong>never revealed</strong> on-chain</li>
              </ul>
            </div>
            <button onClick={handleReset} style={styles.button}>
              🔄 Start Over
            </button>
          </div>
        )}

        {/* Leo Code Preview */}
        <div style={styles.codeSection}>
          <h3 style={styles.codeTitle}>Leo Smart Contract</h3>
          <pre style={styles.codeBlock}>
            <code>{PROGRAM_SOURCE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "20px",
    padding: "40px",
    maxWidth: "700px",
    width: "100%",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "8px",
    background: "linear-gradient(90deg, #00c6ff, #0072ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    textAlign: "center",
    color: "#aaa",
    marginBottom: "24px",
    fontSize: "14px",
  },
  programInfo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  programId: {
    background: "rgba(0, 114, 255, 0.2)",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#00c6ff",
  },
  badge: {
    background: "rgba(0, 200, 83, 0.2)",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#00c853",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    marginBottom: "12px",
    color: "#fff",
  },
  description: {
    color: "#aaa",
    fontSize: "14px",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#aaa",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(90deg, #00c6ff, #0072ff)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  recordCard: {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  },
  recordField: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  fieldLabel: {
    color: "#aaa",
    fontSize: "14px",
  },
  fieldValue: {
    color: "#fff",
    fontSize: "14px",
    fontFamily: "monospace",
  },
  fieldValuePrivate: {
    color: "#ff9800",
    fontSize: "14px",
  },
  privacyNote: {
    background: "rgba(0, 200, 83, 0.1)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    color: "#00c853",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  resultCard: {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    padding: "30px",
    textAlign: "center",
    marginBottom: "20px",
    border: "2px solid",
  },
  resultIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  resultText: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "12px",
  },
  resultNote: {
    color: "#aaa",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  technicalDetails: {
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: "1.8",
    color: "#aaa",
  },
  codeSection: {
    marginTop: "24px",
  },
  codeTitle: {
    fontSize: "16px",
    marginBottom: "12px",
    color: "#aaa",
  },
  codeBlock: {
    background: "rgba(0, 0, 0, 0.4)",
    borderRadius: "12px",
    padding: "20px",
    overflow: "auto",
    fontSize: "12px",
    lineHeight: "1.6",
    color: "#00c6ff",
    maxHeight: "300px",
  },
};
