# Aleo PII Protocol

A privacy-preserving PII (Personally Identifiable Information) storage and sharing protocol built on [Aleo](https://aleo.org).
Users store personal data (addresses, phone numbers, emails) as encrypted records on-chain, and selectively share them with dApps via zero-knowledge proofs.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌─────────┐
│   Frontend   │────▶│  Leo Wallet  │────▶│ pii_protocol_v1   │────▶│  Aleo   │
│   React dApp │◀────│   Adapter    │◀────│    .aleo           │◀────│ Testnet │
└──────────────┘     └──────────────┘     └───────────────────┘     └─────────┘
       │                                                              ▲
       └──────────── @aleo-pii-protocol/sdk ───────────────────────────┘
```

- **Frontend** -- Vite + React 19 + TypeScript + Tailwind CSS v4 demo dApp
- **Leo Wallet Adapter** -- bridges the dApp to the Aleo network via the Leo Wallet browser extension
- **pii_protocol_v1.aleo** -- Leo smart contract managing PII records, sharing, and revocation on-chain
- **@aleo-pii-protocol/sdk** -- TypeScript SDK for encoding payloads and building transaction inputs

---

## Features

- **Create / Read / Update / Delete** PII records stored as on-chain encrypted records
- **Selective sharing** with time-limited, purpose-tagged access grants
- **Revocation** of shared access via on-chain `revoked_nonces` mapping
- **Auto-expiry enforcement** for shared records (block-height based)
- **Cross-dApp interop** via standard request/response format defined in `docs/04-interop-standard.md`

---

## On-chain Transitions

| Transition        | Description                                        |
|-------------------|----------------------------------------------------|
| `create_pii`      | Store a new PII record (owner = `self.signer`)     |
| `update_pii`      | Modify an existing PII record's payload            |
| `delete_pii`      | Remove a PII record                                |
| `share_pii`       | Grant read access to a recipient with expiry       |
| `consume_shared`  | Recipient reads and consumes a shared record       |
| `mark_revoked`    | Owner revokes a previously shared access grant     |

---

## Prerequisites

| Tool             | Version    | Purpose                              |
|------------------|------------|--------------------------------------|
| [Leo](https://leo-lang.org)           | >= 4.0.2   | Leo program compiler and test runner |
| [Node.js](https://nodejs.org)         | >= 18      | Runtime for frontend and tests       |
| [Bun](https://bun.sh)                 | latest     | Fast JS runtime and package manager  |
| [Leo Wallet](https://leo.app)         | latest     | Browser extension for signing txs    |

---

## Quick Start

### 1. Install dependencies

```bash
cd frontend && bun install && cd ..
cd sdk && bun install && cd ..
```

### 2. Run tests

```bash
# L1 -- Leo smart contract tests (16 tests)
cd leo_program/aleo_pii_protocol_v1 && leo test

# L2 -- TypeScript contract tests
cd tests/api/ts && bun test
```

### 3. Start the dev server

```bash
./scripts/dev.sh --no-deploy
```

Or manually:
```bash
cd frontend && bun dev
```

Open `http://localhost:5173`, install [Leo Wallet](https://leo.app), connect, and try creating/sharing a PII record.

---

## SDK Usage

```bash
npm install @aleo-pii-protocol/sdk
```

```typescript
import {
  buildCreatePIIInputs,
  buildSharePIIInputs,
  encodePIIPayload,
} from "@aleo-pii-protocol/sdk";

// Build inputs for a create_pii transaction
const inputs = buildCreatePIIInputs({
  payload: {
    category: 3,
    label: "home_address",
    data: "123 Main St, NYC",
  },
  createdAt: BigInt(Date.now()),
});

// Pass inputs to wallet.requestTransaction()
```

See `sdk/src/` for the full API surface: `codec.ts`, `inputs.ts`, `types.ts`, `constants.ts`.

---

## Testing

Three test layers ensure correctness from unit logic to full user journeys.

```bash
# L1 -- Leo program unit tests (16 tests)
cd leo_program/aleo_pii_protocol_v1 && leo test

# L2 -- TypeScript contract tests (codec + inputs + smoke)
cd tests/api/ts && bun test

# L3 -- Playwright E2E tests (requires dev server running)
cd frontend && bun dev &
cd tests/e2e && npx playwright test
```

| Layer | Location              | Runner        | What it covers                        |
|-------|-----------------------|---------------|---------------------------------------|
| L1    | `leo_program/aleo_pii_protocol_v1/tests/` | `leo test`    | Smart contract transitions and constraints |
| L2    | `tests/api/ts/src/`   | `bun test`    | SDK codec, input builders, edge cases |
| L3    | `tests/e2e/specs/`    | `playwright`  | Wallet connect, create/share/revoke UI flows, error handling |

---

## Project Structure

```
aleo-pii-protocol/
├── leo_program/                     # Leo smart contract
│   └── aleo_pii_protocol_v1/
│       ├── src/main.leo             # Program source (transitions + records)
│       ├── tests/                   # L1 unit tests
│       └── program.json             # Program metadata and dev keys
├── frontend/                        # Vite + React 19 demo dApp
│   └── src/
│       ├── pages/                   # UI pages (FoodDelivery demo)
│       ├── hooks/                   # React hooks for each transition
│       ├── lib/                     # Codec, inputs, block-height utils
│       └── App.tsx                  # Root component with wallet header
├── sdk/                             # @aleo-pii-protocol/sdk package
│   └── src/
│       ├── codec.ts                 # u128 array <-> UTF-8 encoding
│       ├── inputs.ts                # Transaction input builders
│       ├── types.ts                 # Shared TypeScript types
│       └── constants.ts             # Program ID and config
├── tests/
│   ├── api/ts/                      # L2 contract tests
│   │   └── src/
│   │       ├── codec.test.ts        # Codec round-trip tests
│   │       ├── inputs.test.ts       # Input builder validation
│   │       └── hello.test.ts        # Smoke test
│   └── e2e/                         # L3 Playwright E2E tests
│       ├── specs/                   # Test specs (wallet, create, share, revoke, errors)
│       ├── fixtures/                # Mock wallet and helpers
│       ├── screenshots/             # Baseline snapshots
│       └── regressions/             # L3-R regression reproductions
├── docs/                            # Design docs and review reports
├── scripts/
│   ├── dev.sh                       # Dev environment launcher
│   └── deploy.sh                    # Testnet deploy script
└── README.md
```

---

## Documentation

| File                            | Description                                                  |
|---------------------------------|--------------------------------------------------------------|
| `docs/00-vision.md`            | Project vision, goals, and success metrics                   |
| `docs/01-threat-model.md`      | Threat model and security considerations                     |
| `docs/02-data-model.md`        | On-chain data model (PIIPayload, PIIRecord, SharedPIIRecord) |
| `docs/03-program-interface.md` | Leo program interface specification                          |
| `docs/04-interop-standard.md`  | Cross-dApp interop request/response standard                 |
| `docs/05-wallet-integration.md`| Wallet adapter integration guide                             |
| `docs/06-acceptance-criteria.md`| Acceptance criteria and test matrix                         |
| `docs/07-non-goals.md`         | Explicit non-goals and scope boundaries                      |
| `docs/phase3-plan.md`          | Phase 3 roadmap                                              |
| `docs/_review/`                | Review reports                                               |
| `docs/_research/`              | Research notes                                               |

---

## License

MIT
