# L3 End-to-End Tests (`tests/e2e/`)

This package owns the **L3 layer** — Playwright browser journeys that drive the full Aleo PII Protocol stack (wallet adapter, frontend SDK, Leo program) per `AGENTS.md` / `CLAUDE.md` Testing & Validation. Specs live in `specs/`, regression reproductions in `regressions/` (see its own README), seeded data in `fixtures/`, and visual baselines in `screenshots/`. Real journeys land in Task #7; today this directory only ships scaffolding (`specs/smoke.spec.ts`). The dev stack must be started by `./script/dev.sh` before running specs — we deliberately do not auto-launch a `webServer` in `playwright.config.ts`.

## Planned critical-path journeys (see `docs/06-acceptance-criteria.md` §5)

- **Journey 1 — create PII** (`journey-01-create.spec.ts`)
- **Journey 2 — edit PII** (`journey-02-edit.spec.ts`)
- **Journey 3 — delete PII** (`journey-03-delete.spec.ts`)
- **Journey 4 — cross-app share, paradigm A** (`journey-04-share.spec.ts`)
- **Journey 5 — receiver `consume_shared` burn** (`journey-05-consume.spec.ts`)

## Commands

```bash
bun install
bun x playwright install chromium    # one-time browser fetch
./script/dev.sh                       # start dev stack from repo root
bun x playwright test                 # run all journeys
bun x playwright test --list          # enumerate specs (no browser needed)
bun x playwright test regressions/    # run L3-R regression set only
```

## Visual Regression (Snapshots)

Each spec includes `toHaveScreenshot()` calls at key UI interaction points.
Playwright compares the rendered page against baseline PNGs stored in `screenshots/`.

### Workflow

1. **Generate baselines** (first time or after intentional UI changes):
   ```bash
   cd tests/e2e && npx playwright test --update-snapshots
   ```
2. **Run regression checks** (compare current render against baselines):
   ```bash
   cd tests/e2e && npx playwright test
   ```
3. **Update baselines** after approved UI changes:
   ```bash
   cd tests/e2e && npx playwright test --update-snapshots
   ```

### Snapshot inventory

| Spec | Snapshot name | Capture point |
|------|---------------|---------------|
| smoke | `smoke-initial-load.png` | Page after initial load |
| wallet-connect IC-01-01 | `wallet-disconnected.png` | Unconnected state with prompt |
| wallet-connect IC-01-02 | `wallet-connected.png` | Connected state with forms visible |
| create-pii IC-02-01 | `create-pii-form-filled.png` | Address form filled, submit enabled |
| create-pii IC-02-01 | `create-pii-success.png` | After successful create_pii tx |
| share-pii IC-03-01 | `share-pii-disabled-button.png` | Share button disabled without recipient |
| share-pii IC-03-02 | `share-pii-form-filled.png` | Share form filled, button enabled |
| share-pii IC-03-02 | `share-pii-success.png` | After successful share_pii tx |
| revoke-pii IC-04-01 | `revoke-pii-before-click.png` | Revoke button enabled, before click |
| revoke-pii IC-04-01 | `revoke-pii-success.png` | After successful mark_revoked tx |
| consume-after-read IC-06-01 | `consume-shared-success.png` | After consume_shared tx |
| error-handling IC-05-01 | `error-unconnected.png` | Unconnected error state |
| error-handling IC-05-02 | `error-empty-form-disabled.png` | Empty form with disabled submit |
| error-handling IC-05-03 | `error-wallet-reject.png` | Wallet rejection failure state |

Baseline PNGs are stored in `screenshots/<spec-name>/` (Playwright auto-creates
subdirectories per spec file). Commit baselines alongside spec changes.
