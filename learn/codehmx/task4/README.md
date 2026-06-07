# Task 4 - Private Note on Aleo

`private_note_codehmx.aleo` is a simple privacy-preserving Aleo project.

It stores a user's note/task state in a private `record`, so the note id, secret hash, progress, and completion flag are encrypted for the owner. The only public on-chain data is an aggregate completion counter.

## Project Structure

```text
task4/
├── README.md
├── private_note_codehmx/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── program.json
│   ├── src/main.leo
│   └── tests/test_private_note_codehmx.leo
└── scripts/
    ├── deploy.sh
    └── execute_examples.md
```

## Privacy Idea

- `create_note` creates an encrypted private note record.
- `update_progress` consumes the old record and returns a new private record.
- `complete_note` marks the note as complete and only increments a public aggregate counter.
- `reveal_progress` lets the owner reveal the note progress when needed.

## Local Build and Test

Run from this directory:

```bash
leo build --path private_note_codehmx
leo test --path private_note_codehmx
```

## Testnet Deployment

Fill `private_note_codehmx/.env` first:

```bash
NETWORK=testnet
ENDPOINT=https://api.explorer.provable.com/v1
PRIVATE_KEY=APrivateKey1zkp...
PRIORITY_FEE=1000000
```

Then deploy:

```bash
cd private_note_codehmx
../scripts/deploy.sh
```

Program name:

```text
private_note_codehmx.aleo
```

## Status

- Deployed to Aleo testnet.
- Transaction ID: `at1lyj7vpgf2f6j4g7eh34r0ehrm85v49dlnpnejlm23k09wup4xszql6uz52`
- Fee transaction ID: `at1dn4awgytlhfa9yedxltezvr53vzl0ethzewjh67aqlphjk833ygshfvkaq`
- Total deployment fee: `7.063405 credits`
- Explorer: `https://testnet.aleoscan.io/program?id=private_note_codehmx.aleo`

## On-chain Interaction

- Function: `create_note`
- Inputs: `1u64 123field`
- Execution transaction ID: `at10n3dstxaffxum0n279kvp32ssxpqx3u23ldva5e6jgp0slnafv8qje8qlm`
- Execution fee transaction ID: `at1y5rclvszkj5dp2txkgmrrnxnzdnkflcmuzsktuujmrq7es7c4qzs4x8qlx`
- Execution fee: `0.001715 credits`
