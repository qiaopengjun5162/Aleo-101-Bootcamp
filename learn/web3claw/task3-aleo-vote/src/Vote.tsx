import { useState } from "react";
import zkvoteapp_program from "../zkvoteapp/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker";
import "./Vote.css";

const aleoWorker = AleoWorker();

interface VoteRecord {
  owner: string;
  proposal_id: string;
  vote_value: string;
  _nonce?: string;
  _version?: string;
}

function parseVoteRecord(raw: string): VoteRecord | null {
  // Parse "{ owner: xxx.private, proposal_id: xxx.private, ... }" format
  const fields: Record<string, string> = {};
  const cleaned = raw.replace(/[{}]/g, "").trim();
  for (const part of cleaned.split(",")) {
    const [key, ...rest] = part.split(":");
    if (key && rest.length) {
      fields[key.trim()] = rest.join(":").trim();
    }
  }
  if (!fields.owner) return null;
  return fields as unknown as VoteRecord;
}

function Vote() {
  const [voting, setVoting] = useState(false);
  const [proposalId, setProposalId] = useState("");
  const [voteValue, setVoteValue] = useState(true);
  const [result, setResult] = useState<VoteRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createVote() {
    if (!proposalId.trim()) {
      setError("Please enter a proposal ID");
      return;
    }
    setError(null);
    setResult(null);
    setVoting(true);
    try {
      const outputs = await aleoWorker.localProgramExecution(
        zkvoteapp_program,
        "create_vote",
        [proposalId.trim() + "field", voteValue.toString()],
      );
      console.log("create_vote outputs:", outputs);
      // outputs is an array; first element is the VoteRecord string
      const raw = Array.isArray(outputs) ? outputs[0] : String(outputs);
      const parsed = parseVoteRecord(String(raw));
      setResult(parsed || { owner: "unknown", proposal_id: proposalId, vote_value: String(voteValue) });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    }
    setVoting(false);
  }

  return (
    <div className="vote-container">
      {/* Header */}
      <div className="vote-header">
        <h2>🗳️ ZK Vote</h2>
        <p>Private voting powered by zero-knowledge proofs</p>
      </div>

      {/* Body */}
      <div className="vote-body">
        {/* Proposal ID */}
        <div className="form-group">
          <label>Proposal ID</label>
          <input
            type="text"
            placeholder="e.g. 12345"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
            disabled={voting}
          />
        </div>

        {/* Vote Toggle */}
        <div className="form-group">
          <label>Your Vote</label>
          <div className="vote-toggle">
            <button
              className={`vote-toggle-btn ${voteValue ? "active-agree" : ""}`}
              onClick={() => setVoteValue(true)}
              disabled={voting}
              type="button"
            >
              👍 Agree
            </button>
            <button
              className={`vote-toggle-btn ${!voteValue ? "active-disagree" : ""}`}
              onClick={() => setVoteValue(false)}
              disabled={voting}
              type="button"
            >
              👎 Disagree
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          className="vote-submit"
          onClick={createVote}
          disabled={voting || !proposalId.trim()}
        >
          {voting ? (
            <><span className="spinner" />Generating ZK Proof...</>
          ) : (
            "Create Vote"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="vote-error">⚠️ {error}</div>
        )}

        {/* Result */}
        {result && (
          <div className="vote-result">
            <h3>✅ Vote Record Created</h3>
            <div className="vote-result-fields">
              <div className="vote-result-field">
                <span className="field-key">Owner</span>
                <span className="field-value">{result.owner.replace(".private", "")} <span className="badge badge-private">private</span></span>
              </div>
              <div className="vote-result-field">
                <span className="field-key">Proposal</span>
                <span className="field-value">{result.proposal_id.replace(".private", "")} <span className="badge badge-private">private</span></span>
              </div>
              <div className="vote-result-field">
                <span className="field-key">Vote</span>
                <span className="field-value">{result.vote_value.replace(".private", "")} <span className="badge badge-private">private</span></span>
              </div>
              {result._nonce && (
                <div className="vote-result-field">
                  <span className="field-key">Nonce</span>
                  <span className="field-value">{result._nonce.replace(".public", "").slice(0, 20)}... <span className="badge badge-public">public</span></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Vote;
