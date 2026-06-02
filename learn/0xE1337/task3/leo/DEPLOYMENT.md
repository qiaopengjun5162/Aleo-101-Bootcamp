# private_gate_pass.aleo — Testnet Deployment Record

Anonymous membership credential with ZK selective disclosure + nullifier-gated
access. All facts confirmed via the public chain API (not self-reported).

## Program

- **Program ID**: `private_gate_pass.aleo`
- **Network**: Aleo `testnet` (consensus version 14)
- **Deployed**: 2026-05-31
- **Deployer / record owner**: `aleo1ntxq2hsvnh4s5rmh23z2hvdlkd5j97mrxpjutk0ze6nys7ll25zquq3zyr`

## Transactions

| What | Transaction ID | Fee (credits) |
|------|----------------|---------------|
| Deploy | `at13rsq5p8e4w6kyq86f54yx53apjmmym2682cuq2qryqttz77w6gyqe0r68d` | 4.375270 |
| `issue` (mint credential) | `at16syss2a0dmnxkc0qv0yrwysxm3z0n2pvvlus528k7szkh9rkfvpsd95nzc` | 0.001993 |
| `prove_access` (gate pass) | `at1yhke3xy7enrxmqljmhk8w24v8dxarlnf8flhnjk6tusrx6ucwgpqu7hsfk` | 0.003897 |

## On-chain verification

```bash
# Program source live
curl -s "https://api.provable.com/v2/testnet/program/private_gate_pass.aleo"

# Per-gate access counter incremented null -> 1 after prove_access
curl -s "https://api.provable.com/v2/testnet/program/private_gate_pass.aleo/mapping/gate_access_count/777field"
# => "1u64"

# Nullifier recorded as spent (prevents the same credential re-passing the same gate+epoch)
curl -s "https://api.provable.com/v2/testnet/program/private_gate_pass.aleo/mapping/spent_nullifiers/7577126505520532495655215707624402339822535324844589948786053710486331876519field"
# => "true"
```

## What was proven (via `leo run` + on-chain)

- **Selective disclosure**: `prove_access` with `min_tier=2` succeeds for a `tier=3`
  credential — the chain learns "a tier>=2 member passed" but NOT the actual tier.
- **Unlinkable nullifiers** (struct-hash, not field addition):
  - same (secret, gate, epoch) → same nullifier (double-use blocked)
  - different epoch → different nullifier (re-access allowed next epoch, unlinkable)
  - different gate → different nullifier (cross-gate unlinkable)
- **Reverts** on: wrong issuer (assert_eq), tier < min_tier (assert), expired (assert).
- The nullifier is computed ON-CHAIN from a private record field, so the browser
  never needs to reproduce an Aleo hash (no WASM dependency).

## Honest scope notes

- Issuance is NOT access-controlled in this demo (anyone can `issue`); a production
  issuer would `assert` the signer is authorized. Selective disclosure / unlinkability
  do not depend on this.
- Provides STATE-level address↔record unlinkability, not NETWORK-level anonymity
  (fee-payer / timing / IP correlation still apply).
