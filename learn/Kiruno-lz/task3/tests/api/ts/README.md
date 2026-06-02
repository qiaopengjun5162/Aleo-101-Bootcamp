# L2 API Contract Tests (`tests/api/ts/`)

This package hosts the **L2 layer** of the Aleo PII Protocol test pyramid (per `AGENTS.md` / `CLAUDE.md` Testing & Validation). L2 covers two responsibilities: (a) **cross-language contracts** between the Leo program (Rust/Aleo) and the TypeScript SDK — type literal alignment, serialization, error-code mapping — and (b) **frontend-backend coordination** for `requestExecution` payloads and the "fake takeout dApp" protocol. Real cases land in Task #6; this directory currently ships only scaffolding (`src/hello.test.ts` smoke test).

## Planned placeholder cases (see `docs/06-acceptance-criteria.md` §4)

- **SA-01 ~ SA-03**: Leo Program ↔ frontend SDK schema alignment (`create_pii`/`share_pii` inputs, Aleo address format)
- **EI-01 ~ EI-03**: `requestExecution` input completeness (`create_pii`, `share_pii` 6-input, `consume_shared` 1-input)
- **IC-01 ~ IC-06**: fake takeout dApp protocol contract (PIIShareRequest display fields, SharedPIIRecord scan / payload equality / decode / spent state / `consumeAfterRead` SDK helper)

## Commands

```bash
bun install
bun test            # run all L2 cases
bun x tsc --noEmit  # strict type-check
```
