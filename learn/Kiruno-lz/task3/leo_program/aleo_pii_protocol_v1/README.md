# pii_protocol_v1

Scaffold for the Aleo PII Protocol v1 Leo program.

This is a Phase 1 placeholder scaffold: structs, records, mappings, and transitions are declared with minimal placeholder bodies sufficient for `leo build`. Full business logic lands in subsequent tasks.

## Build

```bash
leo build
```

## Known Limitations

> **Leo 4.x Note**: Transition-level `async fn` is not supported. Use `fn -> Final` with `final { ... }` blocks for finalize operations. See `docs/03-program-interface.md §勘误` for details.

## Layout

- `program.json` — program manifest (program id: `pii_protocol_v1.aleo`)
- `src/main.leo` — program source
- `inputs/` — test inputs (empty)
