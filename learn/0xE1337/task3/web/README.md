# Private Gate Pass — web

Frontend for **`private_gate_pass.aleo`** — an anonymous-credential gate built on
Aleo. Prove you're a `tier ≥ N` member of an issuer **without revealing who you
are, your exact tier, or that two visits are the same person.**

- **Stack**: Next.js 16 (App Router) + TypeScript, hand-written CSS design system
  — an *Animal Crossing*-inspired warm island look (parchment + island green,
  full-pill buttons with the Nintendo "press" 3D shadow); no Tailwind.
- **Multiple gates**: Members Club / VIP Lounge / Founders Room, each with its own
  tier bar and live counter — one Gold (tier 3) credential clears the first two
  but not Founders (tier 4), showing the `tier ≥ N` selective disclosure.
- **On-chain reads**: live `gate_access_count` straight from Aleo testnet
  (`api.provable.com/v2`).
- **Field mapping**: issuer/gate names → `field` via Web Crypto SHA-256 (first 31
  bytes) — no WASM/SDK in the browser. The unlinkable nullifier is derived
  **on-chain** from a private record field, so the browser never reproduces an
  Aleo hash.

## Run

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
```

By default the app runs in **`NEXT_PUBLIC_DEMO_MODE=true`** — it walks the full
flow (issue → my credentials → prove access) with fixtures and **stubbed
signing**, while still reading the *real* on-chain counter. This is what the demo
screenshots show.

The **real execution path** (a credential issued + a gate passed, with the
nullifier and counter mutated on-chain) is proven by Leo-CLI transactions — see
`../leo/DEPLOYMENT.md` and `../task3.md` for the testnet transaction IDs.

> Wallet note: the app also wires the `@provablehq/aleo-wallet-adaptor` family
> (Shield/Puzzle/Leo/Fox). Set `NEXT_PUBLIC_DEMO_MODE=false` to drive a wallet.
> On the current alpha adapter, in-browser broadcast was unreliable against the
> testnet RPC, so the demo defaults to DEMO_MODE and leans on the CLI txs as the
> proof of real execution.

## Layout

```
src/
├── app/            layout, page, providers (wallet), globals.css (design tokens)
├── components/     hero · compare · issue · gate · site · wallet
├── hooks/          useIssue · useProveAccess · useCredentials · useGateAccessCount
└── lib/            constants · field (sha256→field, secret) · network (reads) · demo · txpoll
```
