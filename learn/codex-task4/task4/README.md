# Task 4 - Private Counter Testnet Deployment

## Project

`private_counter.aleo` is a small Leo program for a private counter. It creates a private `Counter` record, increments it through a Leo function, and reveals the private value when the owner calls `reveal`.

## Files

```text
learn/codex-task4/task4/
├── README.md
└── private_counter/
    ├── .gitignore
    ├── program.json
    ├── src/main.leo
    └── tests/test_private_counter.leo
```

## Local verification

```bash
leo build --path learn/codex-task4/task4/private_counter
leo test --path learn/codex-task4/task4/private_counter
```

Result:

```text
leo 4.1.0 (9056dc2 HEAD) features=[noconfig]
1 / 1 tests passed.
PASSED: test_private_counter.aleo/test_counter_flow
```

## Testnet deployment

Program:

```text
private_counter.aleo
```

Deployment command:

```bash
PRIVATE_KEY="$PRIVATE_KEY" leo deploy \
  --path learn/codex-task4/task4/private_counter \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  --yes
```

Chain interaction command:

```bash
PRIVATE_KEY="$PRIVATE_KEY" leo execute \
  --path learn/codex-task4/task4/private_counter \
  new_counter \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  --yes
```

Deployment fee estimate from `leo deploy`:

```text
Total Fee: 4.582324 credits
```

## Testnet contract address

```text
Pending: the signing account must receive testnet credits before deployment can be broadcast.
```

## Chain interaction screenshot

```text
Pending: add deployment / interaction screenshot after successful broadcast.
```

## Current blocker

The available local testnet account does not have enough public balance for the deployment fee. The official faucet page is protected by Cloudflare in this environment, so credits could not be requested non-interactively.

```text
Error [ECLI0377041]: invalid public balance for account `aleo1lj2zs258vryvt853j3prn0gqxzch5v22u2a5md04zp7yvw8g5gpse6l8c6`
     |
     = Make sure the account has enough public balance to cover the deployment fee.
```

Security note: private keys, seed phrases, and view keys are intentionally not committed. Use `PRIVATE_KEY` only as a local environment variable.
