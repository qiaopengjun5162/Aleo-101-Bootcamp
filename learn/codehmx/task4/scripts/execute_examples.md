# Execute Examples

Run these after deployment from `task4/private_note_codehmx`.

## Create a Private Note

```bash
leo execute create_note 1u64 123field \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  -y
```

The output is a private `PrivateNote` record. Save that record locally for the next calls.

## Update Private Progress

Replace `<PRIVATE_NOTE_RECORD>` with the record output from `create_note`.

```bash
leo execute update_progress '<PRIVATE_NOTE_RECORD>' 60u8 \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  -y
```

## Complete the Note

```bash
leo execute complete_note '<PRIVATE_NOTE_RECORD>' \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  -y
```

This keeps the note contents private and only increments `completed_total[0field]`.
