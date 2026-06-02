# L3-R Regression Reproduction (`tests/e2e/regressions/`)

This directory hosts **L3-R** scripts per `AGENTS.md` / `CLAUDE.md` Testing & Validation §L3-R. Whenever an L3 spec hits a deterministic defect, do **NOT** patch the UI directly. Instead:

1. State the root-cause hypothesis (frontend render / API contract / state mgmt / async timing).
2. Extract the minimum interaction path (≤ 20 steps) into a permanent `*.spec.ts` here.
3. Co-locate a `REPRO.md` describing: defect symptom, root-cause hypothesis, related L1/L2 modules, fix-flow log.
4. Fix flow: backtrack to L1/L2 → fix underlying layer → L1/L2 green → this L3-R script green → re-run full L3.

See `docs/06-acceptance-criteria.md` §6 for the `REPRO.md` template and the pre-registered regression focus areas.
