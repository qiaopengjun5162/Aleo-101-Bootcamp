# @aleo-pii-protocol/sdk

Standalone SDK for integrating with the Aleo PII Protocol on-chain program. Provides input builders, codec utilities, and interop standard types for third-party dApp integration.

## Installation

```bash
npm install @aleo-pii-protocol/sdk
```

## Usage

### Create a PII Record

```typescript
import { buildCreatePIIInputs } from "@aleo-pii-protocol/sdk";

const inputs = buildCreatePIIInputs({
  payload: { category: 3, label: "address", data: "123 Main St" },
  createdAt: 12345n,
});

// inputs is a tuple ready for Leo Wallet requestTransaction
```

### Share PII with a Requester

```typescript
import { buildSharePIIInputs, PIICategory, PIIPurpose } from "@aleo-pii-protocol/sdk";

const inputs = buildSharePIIInputs({
  sourceRecord: { id: "record_xyz123..." },
  recipient: "aleo1...",
  expiresInBlocks: 100,
  purpose: PIIPurpose.ORDER_DELIVERY,
  currentBlock: 50000,
});
```

### Decode a PII Payload

```typescript
import { decodePIIPayload } from "@aleo-pii-protocol/sdk";

const decoded = decodePIIPayload(record);
console.log(decoded.category, decoded.label, decoded.data);
```

### Build a Share Request

```typescript
import { PIIShareRequest, PIICategory, PIIPurpose } from "@aleo-pii-protocol/sdk";

const request: PIIShareRequest = {
  version: "1.0",
  category: PIICategory.ADDRESS,
  purpose: PIIPurpose.ORDER_DELIVERY,
  requester_address: "aleo1...",
  expires_in_blocks: 100,
  display_name: "My dApp",
  display_purpose: "Delivery address",
};
```

## API Surface

### Constants
- `PII_PROGRAM_ID` -- on-chain program identifier
- `PII_CHAIN_ID` -- target chain identifier
- `DEFAULT_FEE_MICROCREDITS` -- default transaction fee

### Types (Interop Standard)
- `PIICategory`, `PIIPurpose` -- enums for PII classification
- `PIIShareRequest`, `PIIShareResponse`, `PIIShareError` -- request/response schemas
- `PIIShareErrorCode` -- error code enum

### Input Builders
- `generateNonce()` -- random field element for Aleo transitions
- `buildCreatePIIInputs()` -- construct inputs for `create_pii`
- `buildSharePIIInputs()` -- construct inputs for `share_pii`
- `buildConsumeSharedInputs()` -- construct inputs for `consume_shared`
- `buildMarkRevokedInputs()` -- construct inputs for `mark_revoked`

### Codec
- `encodePIIPayload()` -- encode PII data to on-chain u128 arrays
- `decodePIIPayload()` -- decode on-chain record fields to plaintext
- `decodePIIPayloadFromString()` -- decode from Aleo record string format
- `buildPayloadStruct()` -- render encoded payload as Leo struct literal
- `unpackU128ArrayToBytes()` -- low-level u128 array to bytes conversion

## License

MIT
