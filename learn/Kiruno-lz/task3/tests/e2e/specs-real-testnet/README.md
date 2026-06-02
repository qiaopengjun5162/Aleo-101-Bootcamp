# Real Testnet Integration Tests

These tests require a real Leo Wallet with testnet credits.
They are NOT run in CI -- only run manually.

## Prerequisites

- Leo Wallet browser extension installed and unlocked
- Wallet has testnet credits (get from https://faucet.aleo.org)
- `E2E_REAL_WALLET=true` env var set
- Frontend dev server running (`./script/dev.sh`)

## Running

```bash
# Start the dev environment first
./script/dev.sh --no-deploy

# In another terminal, run the real testnet tests
E2E_REAL_WALLET=true npx playwright test specs-real-testnet/
```

## Tests

| ID   | Name                          | Status |
|------|-------------------------------|--------|
| RT-01| wallet connects and shows address | implemented |
| RT-02| create_pii submits real transaction | implemented |
| RT-03| share_pii cross-address flow | TODO |
| RT-04| consume_shared on-chain | TODO |
| RT-05| mark_revoked on-chain | TODO |

## Notes

- RT-01 and RT-02 require manual interaction with the Leo Wallet popup.
- RT-03 through RT-05 are stubbed out and will be implemented once
  the core flows are verified end-to-end.
- These tests use real testnet credits. Each transaction costs a small
  amount of credits from the faucet.
