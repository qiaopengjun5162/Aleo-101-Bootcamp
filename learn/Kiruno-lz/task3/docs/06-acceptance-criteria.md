---
doc: 06-acceptance-criteria
phase: 4
status: stable
last_review: 2026-05-29
related: [[03-program-interface]], [[04-interop-standard]], [[05-wallet-integration]]
---

# Aleo PII Protocol — 验收矩阵

> 相关文档：[[04-interop-standard]] | [[05-wallet-integration]]
>
> **范围**：本文档定义 Aleo PII Protocol 全栈的完整验收标准，按 L1 / L2 / L3 / L3-R 四层分级，对应全局工程规范（CLAUDE.md Testing & Validation）。所有 test case 必须满足才能标记功能为"已交付"。

---

## 目录

1. [总体验收原则](#1-总体验收原则)
2. [L1 Leo Program 单元测试矩阵](#2-l1-leo-program-单元测试矩阵)
3. [L1 前端单元测试矩阵](#3-l1-前端单元测试矩阵)
4. [L2 契约测试](#4-l2-契约测试)
5. [L3 端到端旅程](#5-l3-端到端旅程)
6. [L3-R 回归预留](#6-l3-r-回归预留)
7. [性能门禁](#7-性能门禁)
8. [交付前强制自检](#8-交付前强制自检)

---

## 1. 总体验收原则

### 1.1 分层验收目标

| 层级 | 通过标准 | 执行时机 |
|------|---------|---------|
| L1 | 通过率 100%；新增代码行覆盖率 ≥ 90%；核心算法/状态机分支覆盖率 100% | 每完成一个函数/模块立即运行 |
| L2 | 所有跨模块契约测试通过；影响面扫描完成（无遗漏引用） | 每次功能模块完成后全量运行 |
| L3 | 关键路径全部通过；零未修复的确定性失败 | 仅在交付前作为最终门禁运行 |
| L3-R | 所有已记录回归复现脚本通过 | 与 L3 同步执行 |

### 1.2 失败即阻断

- 任何层级出现确定性失败，MUST 立即修复，MUST NOT 跳过、标记 `todo` 或降级处理
- L2 全量通过前，MUST NOT 进入 L3
- L3 失败 MUST NOT 直接修改 UI 代码，MUST 先回查 L1/L2 并产出 L3-R 复现脚本

### 1.3 确定性输入

- 所有测试使用固定 seed 随机数（`ChaCha::rand_field()` 的 mock 使用固定 seed）
- 时间相关测试使用 mock 块高（不依赖真实链上状态）
- 钱包 API 全量 mock（见 L1 mock 策略）

---

## 2. L1 Leo Program 单元测试矩阵

### 2.1 测试执行命令

```bash
# Leo program 单元测试（位于 program/ 目录）
cd program && leo test

# 前端单元测试
cd frontend && bun test

# 全量 L1
cd program && leo test && cd ../frontend && bun test
```

### 2.2 `create_pii` 测试矩阵

| ID | 测试描述 | 输入条件 | 预期输出 | 验证要点 |
|----|---------|---------|---------|---------|
| C-01 | 正常创建 EMAIL | category=1, payload=[email_encoded, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], nonce=rand_field | 输出 PIIRecord，owner=self.caller | record.category == 1u8 |
| C-02 | 正常创建 PHONE | category=2, payload=[phone_encoded, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] | 输出 PIIRecord，owner=self.caller | record.category == 2u8 |
| C-03 | 正常创建 ADDRESS | category=3, payload=[addr_part1, addr_part2, addr_part3, addr_part4, 0, 0, 0, 0, 0, 0, 0, 0, 0] | 输出 PIIRecord，owner=self.caller | payload 13 个 u128 均被保留 |
| C-04 | payload 全字段（13 个非零 u128） | payload=[max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128, max_u128] | 输出 PIIRecord | payload 完整无截断 |
| C-05 | payload 最大允许尺寸 | payload=[max_u128 × 13]（即 208 字节） | 输出 PIIRecord（不溢出）| transition 正常完成 |
| C-06 | nonce 重用拒绝 | 使用已存在的 nonce 值创建（若 program 维护 nonce mapping） | transition 失败 / 链上 finalize 失败 | 错误信息含"nonce already used" |
| C-07 | 非法 category 拒绝 | category=0（无效值） | transition 失败 | 错误信息含"invalid category" |
| C-08 | 空 payload（全零） | payload=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] | 取决于设计：允许或拒绝（明确文档化） | 行为符合设计文档 |

**伪代码示例（C-01）**：

```leo
// program/tests/create_pii_test.leo （Leo test 文件，语法待 Phase 1 确认）

test "C-01: normal email creation" {
    let caller: address = aleo1test000000000000000000000000000000000000000000000000000000000;
    let email_encoded: u128 = 123456789u128;
    let pii_payload: PIIPayload = PIIPayload {
        category: 1u8,
        label_lo: 0u128,
        label_hi: 0u128,
        data: [email_encoded, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
        data_len: 16u32,
    };
    let nonce: field = 42field;

    let record: PIIRecord = create_pii(
        pii_payload,
        nonce,
        1u8,
        100u64,
    );

    assert_eq(record.owner, caller);
    assert_eq(record.payload.category, 1u8);
    assert_eq(record.payload.data[0], email_encoded);
    assert_eq(record.nonce, 42field);
}
```

### 2.3 `update_pii` 测试矩阵

| ID | 测试描述 | 输入条件 | 预期输出 | 验证要点 |
|----|---------|---------|---------|---------|
| U-01 | 正常更新 payload | 提供有效 PIIRecord + 新 payload + 新 nonce | 旧 record 消耗，产出新 PIIRecord | 新 record.payload == 新 payload |
| U-02 | 非 owner 拒绝 | 调用方地址 ≠ record.owner | transition 失败 | 错误含 "not owner" |
| U-03 | payload 未变化拒绝 | 新 payload == 旧 record.payload | 取决于设计：建议允许（nonce 不同即有效更新）| 行为符合设计文档 |
| U-04 | 已消耗 record 不可再用 | 提供 spent=true 的 record | transition 失败 | 错误含 "record already spent" |
| U-05 | category 字段不变 | 更新 payload 时 category 不可更改 | 输出 record.category == 原 record.category | category 保持一致 |

### 2.4 `delete_pii` 测试矩阵

| ID | 测试描述 | 输入条件 | 预期输出 | 验证要点 |
|----|---------|---------|---------|---------|
| D-01 | 正常删除 | 提供有效 PIIRecord，caller == record.owner | record 被消耗，无输出 record | transition 成功，无新 record 产出 |
| D-02 | 非 owner 拒绝 | caller ≠ record.owner | transition 失败 | 错误含 "not owner" |
| D-03 | 已消耗 record 不可删除 | spent=true 的 record | transition 失败 | 错误含 "record already spent" |

### 2.5 `share_pii` 测试矩阵

| ID | 测试描述 | 输入条件 | 预期输出 | 验证要点 |
|----|---------|---------|---------|---------|
| S-01 | 正常共享 | 有效 PIIRecord + receiver_addr + expires_at（未来块高）+ valid purpose + nonce | 产出 PIIRecord(owner=caller) + SharedPIIRecord(owner=receiver) | 两条 record 均产出；owner 字段正确 |
| S-02 | 过期时间合法性：过去块高拒绝 | expires_at = current_block - 1 | transition 失败 | 错误含 "expires_at must be in future" |
| S-03 | 过期时间合法性：当前块高拒绝 | expires_at = current_block | transition 失败 | 错误含 "expires_at must be in future" |
| S-04 | 过期时间合法性：未来块高允许 | expires_at = current_block + 100 | 正常共享 | SharedPIIRecord.expires_at == current_block + 100 |
| S-05 | purpose 编码正确 | purpose=1u128（ORDER_DELIVERY） | SharedPIIRecord.purpose == 1u128 | 枚举值端到端不变 |
| S-06 | 非法 purpose 值拒绝 | purpose=0u128 或 purpose=超出 enum 定义范围的值（如 9999u128） | transition 失败 | 错误含 "invalid purpose" |
| S-07 | 非 owner 拒绝 | caller ≠ source.owner | transition 失败 | 错误含 "not owner" |
| S-08 | receiver == caller（自共享）| receiver = self.caller | 取决于设计：建议拒绝 | 行为符合设计文档 |
| S-09 | SharedPIIRecord payload 完整性 | 共享 ADDRESS category（4 个 u128 均非零）| SharedPIIRecord.payload == source.payload | payload 未被截断 |
| S-10 | 原始 record owner 保留 | share 后 | 返还的 PIIRecord.owner == self.caller | 原 owner 不变 |

### 2.6 `consume_shared` 测试矩阵

| ID | 测试描述 | 输入条件 | 预期输出 | 验证要点 |
|----|---------|---------|---------|---------|
| CS-01 | 正常销毁 | 有效 SharedPIIRecord，caller == record.owner，block.height <= record.expires_at | record 被消耗，无输出 | transition 成功 |
| CS-02 | 非 receiver 拒绝 | caller ≠ record.owner | transition 失败 | 错误含 "not receiver" |
| CS-03 | 过期 record 拒绝 | block.height > record.expires_at | transition 失败 | 错误含 "record expired" |
| CS-04 | 已消耗 record 不可再 consume | spent=true 的 SharedPIIRecord | transition 失败 | 错误含 "record already spent" |
| CS-05 | 已撤销 record 拒绝（若实现 revocation mapping） | PIIRecord.nonce 在 revoked_nonces mapping 中 | transition 失败 | 错误含 "record revoked" |
| CS-06 | 恰好在 expires_at 块高时 | block.height == record.expires_at | 取决于设计（建议允许：当块高==过期值时仍可 consume）| 行为符合设计文档 |

---

## 3. L1 前端单元测试矩阵

### 3.1 测试文件位置

```
frontend/src/
├── utils/
│   ├── payload.ts              # PII payload 编解码
│   ├── payload.test.ts         # L1 测试
│   ├── nonce.ts                # nonce 生成
│   └── nonce.test.ts
├── hooks/
│   ├── usePIIOperations.ts
│   └── usePIIOperations.test.ts
└── adapters/
    ├── mock-wallet.ts
    └── mock-wallet.test.ts
```

### 3.2 UTF-8 打包/解包正确性测试

```typescript
// frontend/src/utils/payload.test.ts
import { describe, it, expect } from "bun:test";
import { encodePIIPayload, decodePIIPayload } from "./payload";

describe("PIIPayload encoding/decoding", () => {
  // P-01: 正常 ASCII 字符串
  it("P-01: encodes and decodes ASCII email", () => {
    const input = "user@example.com";
    const encoded = encodePIIPayload(input);
    expect(encoded).toMatch(/^\[\d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128, \d+u128\]$/);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-02: 空字符串边界
  it("P-02: handles empty string (boundary)", () => {
    const input = "";
    const encoded = encodePIIPayload(input);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-03: 最大尺寸（208 字节 = 13 × u128）
  it("P-03: encodes exactly 208 bytes without truncation", () => {
    const input = "A".repeat(208);  // 208 个 ASCII 字符 = 208 字节
    const encoded = encodePIIPayload(input);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-04: 超过 208 字节（需抛出或截断，行为符合设计）
  it("P-04: throws or truncates on input > 208 bytes", () => {
    const input = "A".repeat(209);
    // 若设计为抛出：
    expect(() => encodePIIPayload(input)).toThrow("payload exceeds 208 bytes");
    // 若设计为截断：取消上行注释，使用 decodePIIPayload(encodePIIPayload(input)).length <= 208
  });

  // P-05: emoji（多字节 UTF-8）
  it("P-05: handles emoji correctly (multi-byte UTF-8)", () => {
    const input = "😀test";  // 😀 占 4 字节
    const encoded = encodePIIPayload(input);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-06: 中文字符（多语言）
  it("P-06: handles CJK characters", () => {
    const input = "北京市朝阳区";  // 6 个汉字 × 3 字节 = 18 字节
    const encoded = encodePIIPayload(input);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-07: 混合语言
  it("P-07: handles mixed language strings", () => {
    const input = "John 张三 +86-10-1234";
    const encoded = encodePIIPayload(input);
    expect(decodePIIPayload(encoded)).toBe(input);
  });

  // P-08: 解码对称性（encode → decode 恒等）
  it("P-08: encode/decode is perfectly symmetric for valid inputs", () => {
    const inputs = [
      "test@email.com",
      "+1-800-555-0100",
      "123 Main St, Springfield",
      "Alice Wonderland",
    ];
    for (const input of inputs) {
      expect(decodePIIPayload(encodePIIPayload(input))).toBe(input);
    }
  });
});
```

### 3.3 PIIPayload 序列化/反序列化测试

```typescript
// frontend/src/utils/payload.test.ts（续）

describe("PIIRecord serialization", () => {
  // SR-01: 完整 AleoRecord → PIIRecord 转换
  it("SR-01: parses AleoRecord to PIIRecord correctly", () => {
    const aleoRecord = {
      id: "record1...",
      owner: "aleo1test...",
      program_id: "pii_protocol_v1.aleo",
      recordName: "PIIRecord",
      spent: false,
      data: {
        category: "1u8",
        payload: "[123456u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128]",
        nonce: "42field",
      },
    };
    const piiRecord = parseAleoRecordToPII(aleoRecord);
    expect(piiRecord.category).toBe(1);
    expect(piiRecord.id).toBe("record1...");
    expect(piiRecord.spent).toBe(false);
  });

  // SR-02: 解析 u128 数组字符串
  it("SR-02: parses u128 array string to bigint array", () => {
    const raw = "[100u128, 200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128]";
    const arr = parseU128Array(raw);
    expect(arr).toEqual([100n, 200n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]);
  });

  // SR-03: 解析 category 枚举
  it("SR-03: parses kind field to PIICategory enum", () => {
    expect(parsePIIKind("1u8")).toBe(PIICategory.EMAIL);
    expect(parsePIIKind("2u8")).toBe(PIICategory.PHONE);
    expect(parsePIIKind("3u8")).toBe(PIICategory.ADDRESS);
  });
});
```

### 3.4 钱包 adapter mock 测试

```typescript
// frontend/src/adapters/mock-wallet.test.ts

describe("MockLeoWalletAdapter", () => {
  const adapter = new MockLeoWalletAdapter();

  // MW-01: connect 设置 connected 状态
  it("MW-01: connect resolves and sets state", async () => {
    await expect(
      adapter.connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet)
    ).resolves.toBeUndefined();
  });

  // MW-02: disconnect 清空 publicKey
  it("MW-02: disconnect clears session", async () => {
    await adapter.connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);
    await adapter.disconnect();
    // publicKey 应为 null 或清空
  });

  // MW-03: requestRecordPlaintexts 返回 fixture 数据
  it("MW-03: requestRecordPlaintexts returns mock records", async () => {
    const records = await adapter.requestRecordPlaintexts("pii_protocol_v1.aleo");
    expect(records).toBeArray();
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty("recordName");
    expect(records[0]).toHaveProperty("data");
  });

  // MW-04: requestTransaction 返回 mock tx id
  it("MW-04: requestTransaction returns mock transactionId", async () => {
    const result = await adapter.requestTransaction({
      address: "aleo1test...",
      chainId: "1",
      transitions: [{
        program: "pii_protocol_v1.aleo",
        functionName: "create_pii",
        inputs: [
          "{ category: 1u8, label_lo: 0u128, label_hi: 0u128, data: [0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128], data_len: 0u32 }",
          "1field",
          "1u8",
          "100u64",
        ],
      }],
      fee: 0.01,
      feePrivate: false,
    });
    expect(result.transactionId).toMatch(/^mock-tx-\d+$/);
  });

  // MW-05: signMessage 返回 64 字节签名
  it("MW-05: signMessage returns 64-byte Uint8Array", async () => {
    const message = new TextEncoder().encode("test-nonce|1234567890");
    const { signature } = await adapter.signMessage(message);
    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature.length).toBe(64);
  });
});
```

### 3.5 nonce 生成器测试

```typescript
// frontend/src/utils/nonce.test.ts

describe("generateNonce", () => {
  // N-01: 返回合法 Leo field 字面量
  it("N-01: returns valid Leo field literal", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^\d+field$/);
  });

  // N-02: 两次调用返回不同值（随机性）
  it("N-02: generates unique nonces", () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).not.toBe(n2);
  });

  // N-03: 值在 field 安全范围内
  it("N-03: value is within field safe range", () => {
    const nonce = generateNonce();
    const value = BigInt(nonce.replace("field", ""));
    const FIELD_MODULUS = BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239041");
    expect(value).toBeLessThan(FIELD_MODULUS);
    expect(value).toBeGreaterThan(0n);
  });
});
```

---

## 4. L2 契约测试

### 4.1 测试执行命令

```bash
# L2 契约测试
cd tests/api/ts && bun test

# 需要先启动本地开发环境
./script/dev.sh
```

### 4.2 Leo Program ↔ 前端 SDK 的 schema 对齐测试

**目的**：验证前端构建的 transition inputs 字符串格式与 Leo program 期望的类型字面量完全对齐。

```typescript
// tests/api/ts/schema-alignment.test.ts

describe("Schema alignment: Leo Program ↔ Frontend SDK", () => {
  // SA-01: create_pii inputs 格式验证
  it("SA-01: create_pii inputs match Leo type literals", async () => {
    const { buildCreatePIIInputs } = await import("../../../frontend/src/utils/transaction");
    const inputs = buildCreatePIIInputs(PIICategory.EMAIL, "test@example.com");

    // 验证 category 字段格式：必须是 "<number>u8"
    expect(inputs[0]).toMatch(/^\d+u8$/);
    expect(inputs[0]).toBe("1u8");

    // 验证 payload 字段格式：必须是 "[<u128> × 13]"（PIIPayload struct 整体序列化后传入）
    expect(inputs[1]).toMatch(/^PIIPayload \{.*data: \[(\d+u128, ){12}\d+u128\].*\}$/);

    // 验证 nonce 字段格式：必须是 "<number>field"
    expect(inputs[2]).toMatch(/^\d+field$/);
  });

  // SA-02: share_pii inputs 格式验证
  it("SA-02: share_pii inputs match Leo type literals", async () => {
    const inputs = buildSharePIIInputs(
      mockPIIRecord,
      "aleo1receiver000000000000000000000000000000000000000000000000000000",
      100,   // expires_in_blocks
      1,     // purpose
      12345  // mock current block
    );

    // expires_at 必须是 "<number>u64"
    expect(inputs[2]).toMatch(/^\d+u64$/);
    expect(BigInt(inputs[2].replace("u64", ""))).toBe(BigInt(12445));

    // purpose 必须是 "<number>u128"
    expect(inputs[3]).toMatch(/^\d+u128$/);

    // new_nonce 必须是 "<number>field"
    expect(inputs[4]).toMatch(/^\d+field$/);
    // shared_at 必须是 "<number>u64"
    expect(inputs[5]).toMatch(/^\d+u64$/);
  });

  // SA-03: 地址格式验证
  it("SA-03: Aleo address format is valid", () => {
    const validAddr = "aleo1test000000000000000000000000000000000000000000000000000000000";
    expect(isValidAleoAddress(validAddr)).toBe(true);
    expect(isValidAleoAddress("0x1234")).toBe(false);
    expect(isValidAleoAddress("")).toBe(false);
  });
});
```

### 4.3 requestExecution 输入参数完整性测试

```typescript
// tests/api/ts/execution-integrity.test.ts

describe("requestExecution input completeness", () => {
  const mockWallet = new MockLeoWalletAdapter();

  // EI-01: create_pii 不缺字段
  it("EI-01: create_pii transaction has all required inputs", async () => {
    const capturedTx = await captureTransaction(mockWallet, async () => {
      const { createPII } = buildPIIOperations(mockWallet);
      await createPII(PIICategory.EMAIL, "test@example.com");
    });

    expect(capturedTx.transitions[0].program).toBe("pii_protocol_v1.aleo");
    expect(capturedTx.transitions[0].functionName).toBe("create_pii");
    expect(capturedTx.transitions[0].inputs).toHaveLength(4);
    // [payload: PIIPayload, nonce: field, version: u8, created_at: u64]
    expect(capturedTx.fee).toBeGreaterThan(0);
  });

  // EI-02: share_pii 包含所有 6 个 inputs
  it("EI-02: share_pii transaction has 6 required inputs", async () => {
    const capturedTx = await captureTransaction(mockWallet, async () => {
      const { sharePII } = buildPIIOperations(mockWallet);
      await sharePII(mockPIIRecord, "aleo1receiver...", 100, 1);
    });

    expect(capturedTx.transitions[0].inputs).toHaveLength(6);
    // [source_record, recipient, expires_at, purpose, new_nonce, shared_at]
  });

  // EI-03: consume_shared 包含 1 个 input（SharedPIIRecord）
  it("EI-03: consume_shared has exactly 1 input", async () => {
    const capturedTx = await captureTransaction(mockWallet, async () => {
      const { consumeShared } = buildPIIOperations(mockWallet);
      await consumeShared(mockSharedPIIRecord);
    });

    expect(capturedTx.transitions[0].functionName).toBe("consume_shared");
    expect(capturedTx.transitions[0].inputs).toHaveLength(1);
  });
});
```

### 4.4 错误码端到端映射测试

```typescript
// tests/api/ts/error-mapping.test.ts

describe("Error code end-to-end mapping", () => {
  // EM-01: 用户拒绝 → PIIErrorCode.USER_REJECTED
  it("EM-01: WalletUserRejectedError maps to USER_REJECTED", async () => {
    const rejectingWallet = createRejectingMockWallet();
    const { createPII } = buildPIIOperations(rejectingWallet);

    await expect(createPII(PIICategory.EMAIL, "test@example.com"))
      .rejects.toMatchObject({ code: PIIErrorCode.USER_REJECTED });
  });

  // EM-02: 钱包未连接 → PIIErrorCode.WALLET_NOT_CONNECTED
  it("EM-02: WalletNotConnectedError maps to WALLET_NOT_CONNECTED", async () => {
    const disconnectedWallet = createDisconnectedMockWallet();
    const { fetchPIIList } = buildPIIOperations(disconnectedWallet);

    await expect(fetchPIIList())
      .rejects.toMatchObject({ code: PIIErrorCode.WALLET_NOT_CONNECTED });
  });

  // EM-03: 扫描超时 → 返回空数组并展示 toast（不抛出）
  it("EM-03: record scan timeout returns empty array gracefully", async () => {
    const timeoutWallet = createTimeoutMockWallet(35_000);
    const { fetchPIIList } = buildPIIOperations(timeoutWallet);
    const result = await fetchPIIList();
    expect(result).toEqual([]);
  });
});
```

### 4.5 "假外卖 dApp" 协议契约测试

**目的**：以第三方接收方 dApp 的视角，验证完整范式 A 协议流程的契约。

```typescript
// tests/api/ts/interop-contract.test.ts

describe("InteropContract: MockDeliveryDApp as receiver (Paradigm A)", () => {
  const userWallet = new MockLeoWalletAdapter({ role: "sender" });
  const dappWallet = new MockLeoWalletAdapter({ role: "receiver" });

  // IC-01: dApp 发送 ShareRequest，用户钱包接收到 display_name 和 display_purpose
  it("IC-01: PIIShareRequest contains all required display fields", () => {
    const request = buildShareRequest({
      category: PIICategory.ADDRESS,
      purpose: PIIPurpose.ORDER_DELIVERY,
      requester_address: DAPP_ADDRESS,
      expires_in_blocks: 100,
      display_name: "假外卖",
      display_purpose: "订单配送地址确认",
    });

    expect(request.version).toBe("1.0");
    expect(request.display_name).toBeTruthy();
    expect(request.display_purpose).toBeTruthy();
    expect(request.requester_address).toMatch(/^aleo1/);
  });

  // IC-02: share_pii 后，dApp 钱包可扫描到 SharedPIIRecord
  it("IC-02: after share_pii, receiver can find SharedPIIRecord", async () => {
    // 模拟共享操作完成（MockLeoWalletAdapter 注入 SharedPIIRecord）
    await simulateSharePII(userWallet, DAPP_ADDRESS);

    const records = await dappWallet.requestRecordPlaintexts("pii_protocol_v1.aleo");
    const sharedRecords = records.filter(r => r.recordName === "SharedPIIRecord");
    expect(sharedRecords.length).toBeGreaterThan(0);
  });

  // IC-03: SharedPIIRecord 的 payload 与原 PIIRecord payload 完全一致
  it("IC-03: SharedPIIRecord payload matches source PIIRecord payload", async () => {
    const source = MOCK_ADDRESS_PII_RECORD;
    const shared = await getMockSharedRecord(source, DAPP_ADDRESS);

    expect(shared.data.payload).toBe(source.data.payload);
    expect(shared.data.category).toBe(source.data.category);
  });

  // IC-04: dApp 解码 payload 得到正确地址字符串
  it("IC-04: dApp decodes SharedPIIRecord payload to correct address string", async () => {
    const shared = MOCK_SHARED_ADDRESS_RECORD;
    const decoded = decodePIIPayload(shared.data.payload);
    expect(decoded).toBe(ORIGINAL_ADDRESS_STRING);
  });

  // IC-05: consume_shared 后 record 变为 spent
  it("IC-05: after consume_shared, record is marked as spent", async () => {
    const shared = MOCK_SHARED_ADDRESS_RECORD;
    await dappWallet.requestTransaction(buildConsumeTx(shared));

    const records = await dappWallet.requestRecordPlaintexts("pii_protocol_v1.aleo");
    const found = records.find(r => r.id === shared.id);
    expect(found?.spent).toBe(true);
  });

  // IC-06: consumeAfterRead SDK helper 自动触发 consume
  it("IC-06: verifies consumeAfterRead SDK helper auto-triggers consume", async () => {
    const shared = MOCK_SHARED_ADDRESS_RECORD;
    let receivedPayload: string | null = null;
    let consumeCalled = false;

    // consumeAfterRead 接受 record + 业务回调
    await consumeAfterRead(shared, async (decryptedPayload: string) => {
      receivedPayload = decryptedPayload;
    });

    // (a) 业务回调收到解密后 payload
    expect(receivedPayload).not.toBeNull();
    expect(receivedPayload).toBe(ORIGINAL_ADDRESS_STRING);

    // (b) consume_shared transition 被自动调用
    const capturedTxs = dappWallet.getCapturedTransactions();
    consumeCalled = capturedTxs.some(
      tx => tx.transitions[0].functionName === "consume_shared"
    );
    expect(consumeCalled).toBe(true);

    // (c) record 状态变为 spent
    const records = await dappWallet.requestRecordPlaintexts("pii_protocol_v1.aleo");
    const found = records.find(r => r.id === shared.id);
    expect(found?.spent).toBe(true);
  });
});
```

> **注意（C4 强制 consume 语义）**：C4 强制 consume 是"语义强制"而非"技术强制"，链上无法阻止接收方不调用 consume；IC-06 通过验证 SDK 工具函数 `consumeAfterRead` 的自动行为来对冲——接收方 dApp 只要使用标准 SDK，consume 就会被强制触发。

---

## 5. L3 端到端旅程

### 5.1 测试执行命令

```bash
# 前置：确保开发环境已启动
./script/dev.sh

# 执行 L3 全量测试
cd tests/e2e && npx playwright test

# 仅执行特定旅程
cd tests/e2e && npx playwright test specs/journey-1-create.spec.ts
```

### 5.2 旅程 1：创建 PII 完整流程

**文件**：`tests/e2e/specs/journey-1-create.spec.ts`

**前置条件**：Mock Leo Wallet 已注入（`MOCK_WALLET=true`），testnet 连接可用。

| 步骤 | 操作 | 截图断言清单 |
|------|------|------------|
| 1 | 打开首页 | [ ] 页面标题可见；[ ] "连接钱包" 按钮可见；[ ] 无 JS 错误 |
| 2 | 点击"连接钱包" | [ ] Leo Wallet 连接弹窗出现（或 Mock 自动连接）|
| 3 | 连接成功后 | [ ] 用户地址显示在导航栏（truncated）；[ ] "我的 PII" 菜单可访问 |
| 4 | 点击"添加 PII" | [ ] 表单出现；[ ] 类别下拉可见；[ ] 所有字段无错误状态 |
| 5 | 选择类别"邮箱" | [ ] 邮箱输入框出现；[ ] placeholder 文案正确 |
| 6 | 输入邮箱值 `test@example.com` | [ ] 输入值正确显示 |
| 7 | 点击"提交" | [ ] 钱包签名弹窗出现（Mock：自动确认）；[ ] loading 状态显示 |
| 8 | 等待交易确认 | [ ] 确认成功提示出现；[ ] 倒计时或 spinner 正常 |
| 9 | 返回列表页 | [ ] `test@example.com` 条目出现；[ ] 类别标签为"邮箱"；[ ] 无重复条目 |

**截图断言示例**：

```typescript
// tests/e2e/specs/journey-1-create.spec.ts
import { test, expect } from "@playwright/test";

test("J1: Create PII email record end-to-end", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // 步骤 1 断言
  await expect(page).toHaveTitle(/PII Manager/);
  await expect(page.getByRole("button", { name: "连接钱包" })).toBeVisible();

  // 步骤 2-3：连接钱包（Mock 模式自动连接）
  await page.click('[data-testid="connect-wallet-btn"]');
  await expect(page.getByTestId("wallet-address")).toBeVisible();

  // 步骤 4：点击添加 PII
  await page.click('[data-testid="add-pii-btn"]');
  await expect(page.getByTestId("pii-form")).toBeVisible();

  // 步骤 5-6：填表
  await page.selectOption('[data-testid="pii-category-select"]', "1");  // EMAIL
  await page.fill('[data-testid="pii-value-input"]', "test@example.com");

  // 步骤 7：截图（提交前）
  await page.screenshot({ path: "tests/e2e/screenshots/j1-before-submit.png" });

  // 步骤 7：提交
  await page.click('[data-testid="pii-submit-btn"]');

  // 步骤 8：等待确认（最长 30s）
  await expect(page.getByTestId("tx-success-toast")).toBeVisible({ timeout: 30_000 });

  // 步骤 9：列表断言
  await page.click('[data-testid="my-pii-nav"]');
  await expect(page.getByText("test@example.com")).toBeVisible();
  await expect(page.getByTestId("pii-category-badge-email")).toBeVisible();

  // 最终截图
  await page.screenshot({ path: "tests/e2e/screenshots/j1-pii-list.png" });
  await expect(page).toHaveScreenshot("j1-pii-list.png");
});
```

### 5.3 旅程 2：编辑 PII

**文件**：`tests/e2e/specs/journey-2-update.spec.ts`

| 步骤 | 操作 | 截图断言清单 |
|------|------|------------|
| 1 | 进入 PII 列表，选择一条邮箱记录 | [ ] 条目可见；[ ] "编辑"按钮可见 |
| 2 | 点击"编辑" | [ ] 表单打开，旧值预填 |
| 3 | 修改值为 `new@example.com` | [ ] 输入框更新 |
| 4 | 提交 | [ ] 钱包签名弹窗；[ ] loading 状态 |
| 5 | 等待确认 | [ ] 成功 toast |
| 6 | 返回列表 | [ ] 旧值 `test@example.com` 消失；[ ] 新值 `new@example.com` 出现；[ ] 无旧条目残留 |

**关键断言**：旧 record（`spent=true`）不得出现在列表中。

> **注意（C4 强制 consume 语义）**：C4 强制 consume 是"语义强制"而非"技术强制"，链上无法阻止接收方不调用 consume；测试通过验证 SDK 工具函数 `consumeAfterRead` 的自动行为来对冲。

### 5.4 旅程 3：删除 PII

**文件**：`tests/e2e/specs/journey-3-delete.spec.ts`

| 步骤 | 操作 | 截图断言清单 |
|------|------|------------|
| 1 | PII 列表，选中目标条目 | [ ] 条目可见 |
| 2 | 点击"删除"，确认对话框 | [ ] 确认对话框包含警告文案 |
| 3 | 确认删除 | [ ] 钱包签名弹窗；[ ] loading 状态 |
| 4 | 等待确认 | [ ] 成功 toast |
| 5 | 列表更新 | [ ] 被删条目不再出现；[ ] 空态提示（若列表为空） |

### 5.5 旅程 4：跨应用共享（范式 A）

**文件**：`tests/e2e/specs/journey-4-share.spec.ts`

**前置条件**：假外卖 dApp（`MockDeliveryDApp`）作为测试桩运行在 `:3001`。

| 步骤 | 操作 | 截图断言清单 |
|------|------|------------|
| 1 | PII Manager dApp 中，选中一条 ADDRESS 类型 PII | [ ] 条目可见；[ ] "共享"按钮可见 |
| 2 | 点击"共享"，填写共享目标（MockDeliveryDApp 的 Aleo address）| [ ] 地址输入框；[ ] 有效期选择 |
| 3 | 点击"确认共享" | [ ] 授权弹窗出现，包含 display_name="假外卖"、display_purpose、有效期文案 |
| 4 | 点击"允许" | [ ] loading 状态；[ ] 钱包弹窗（Mock 自动确认）|
| 5 | 共享成功 | [ ] 成功 toast；[ ] 原 PIIRecord 仍在列表（owner 未变）|
| 6 | 切换到假外卖 dApp（`:3001`） | [ ] 共享 record 出现在待处理列表 |
| 7 | 点击"查看并使用" | [ ] 地址明文正确展示（与 PII Manager 中原始值一致）|

**关键断言**：步骤 6 的假外卖 dApp 可见性——这是**测试最难自动化的步骤**（见 6.3 说明）。

### 5.6 旅程 5：接收方 consume_shared 销毁

**文件**：`tests/e2e/specs/journey-5-consume.spec.ts`

**前置条件**：旅程 4 完成，假外卖 dApp 已有一条 `SharedPIIRecord`。

| 步骤 | 操作 | 截图断言清单 |
|------|------|------------|
| 1 | 假外卖 dApp 中，点击"使用并销毁" | [ ] 确认弹窗 |
| 2 | 确认 | [ ] 钱包签名弹窗；[ ] loading 状态 |
| 3 | consume_shared 完成 | [ ] "数据已销毁"确认文案；[ ] 条目从列表消失 |
| 4 | 验证 record 状态 | [ ] 同一条 record 不再出现（`spent=true`）；[ ] 再次扫描无重复读取 |

---

## 6. L3-R 回归预留

### 6.1 目录约定

```
tests/e2e/
├── regressions/
│   ├── REPRO.md              # 模板（见 6.2）
│   ├── r001-double-spend/    # 示例：record 被双次消费回归
│   │   ├── repro.spec.ts
│   │   └── REPRO.md
│   └── ...
```

### 6.2 REPRO.md 模板

```markdown
# 回归复现文档：[编号]-[简短描述]

## 缺陷现象
<!-- 具体的失败表现，包括截图路径或控制台输出 -->

## 根因假设
<!-- 必须明确分类：前端渲染 / API 契约 / 状态管理 / 异步时序 -->
- 分类：[前端渲染 | API 契约 | 状态管理 | 异步时序]
- 假设：[具体原因]

## 最小交互路径（≤ 20 步）
1. 步骤一
2. 步骤二
...（不超过 20 步）

## 关联 L1/L2 模块
- L1: [相关测试文件路径]
- L2: [相关契约测试文件路径]

## 修复流程记录
- [ ] L1/L2 根因确认
- [ ] 底层修复完成
- [ ] L1/L2 全量通过
- [ ] L3-R 脚本通过
- [ ] L3 全量验收通过
```

### 6.3 预定义回归关注点

以下场景在 Phase 1 实测中可能出现回归，需要预留 L3-R 槽位：

| 编号 | 场景 | 关联旅程 | 根因分类 |
|------|------|---------|---------|
| R-001 | update_pii 后旧 record 仍显示在列表中（缓存未刷新）| J2 | 状态管理 |
| R-002 | share_pii 后原 record 消失（UTXO 被消耗而非返还）| J4 | API 契约 |
| R-003 | requestRecordPlaintexts 超时导致列表为空 | J1, J4 | 异步时序 |
| R-004 | consume_shared 失败但 UI 显示成功（tx 失败未处理）| J5 | 状态管理 |
| R-005 | 跨 dApp 共享后接收方 record 扫描延迟（链确认未等待）| J4-6 | 异步时序 |

---

## 7. 性能门禁

### 7.1 L1 性能门禁

| 测试类型 | 最大允许时间 | 触发行为 |
|---------|------------|---------|
| 同步纯函数（encodePIIPayload、parseAleoRecord 等）| ≤ 100ms | 超时视为失败 |
| 异步函数（涉及 mock wallet 调用）| ≤ 500ms | 超时视为失败 |

```typescript
// bun:test 中设置超时
it("payload encoding is fast", async () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    encodePIIPayload("test@example.com");
  }
  expect(performance.now() - start).toBeLessThan(100);
}, { timeout: 500 });
```

### 7.2 L2 性能门禁

| 操作 | 最大允许时间 | 备注 |
|------|------------|------|
| Transition 本地构建（buildCreatePIIInputs 等）| ≤ 100ms | 纯 JS 操作 |
| Mock wallet requestTransaction | ≤ 500ms | Mock 不含链上等待 |
| Mock record scan（requestRecordPlaintexts）| ≤ 1s | Mock fixture 加载 |
| **Transition 链上执行（testnet 实测）** | ≤ 30s（暂定）| **待 Phase 1 实测后调整** |

### 7.3 L3 性能门禁

| 旅程 | 最大允许时间 | 备注 |
|------|------------|------|
| 旅程 1（创建 PII）| ≤ 60s | 含链上确认等待（mock 模式下 ≤ 10s）|
| 旅程 2（编辑 PII）| ≤ 60s | 同上 |
| 旅程 3（删除 PII）| ≤ 60s | 同上 |
| 旅程 4（共享）| ≤ 90s | 含两个钱包交互，时间稍长 |
| 旅程 5（consume）| ≤ 60s | 同上 |

**注意**：以上 L3 时间为 Mock Wallet 模式下的目标值。真实 testnet 模式中，链上确认时间由网络决定，性能门禁应重新标定。

### 7.4 性能测量命令

```bash
# L3 中测量旅程时间
cd tests/e2e && npx playwright test --reporter=json | jq '.suites[].specs[].tests[].results[].duration'
```

---

## 8. 交付前强制自检

以下 checklist 在每次功能交付前 MUST 全部确认通过，缺少任一项不得标记为"已交付"：

### 8.1 L1 自检

- [ ] L1 通过率 100%（`leo test` 全绿；`bun test` 全绿）
- [ ] 新增代码行覆盖率 ≥ 90%（使用 `bun test --coverage` 验证）
- [ ] 核心算法（encodePIIPayload / decodePIIPayload / buildSharePIIInputs）分支覆盖率 100%
- [ ] 零超时失败（所有 test case 在阈值内完成）
- [ ] 所有边界输入（空字符串、最大值、emoji、多语言）均有对应 test case

### 8.2 L2 自检

- [ ] L2 影响面扫描完成（`bun tsc -b` 无类型错误）
- [ ] Leo Program ↔ 前端 SDK schema 对齐测试通过（SA-01 ~ SA-03）
- [ ] requestExecution 输入完整性测试通过（EI-01 ~ EI-03）
- [ ] 错误码端到端映射测试通过（EM-01 ~ EM-03）
- [ ] 假外卖 dApp 协议契约测试通过（IC-01 ~ IC-06）
- [ ] 所有公共 API 变更已扫描影响范围并更新对应测试

### 8.3 L3 自检

- [ ] 旅程 1（创建 PII）通过，截图基线对齐
- [ ] 旅程 2（编辑 PII）通过，旧 record 从列表消失
- [ ] 旅程 3（删除 PII）通过
- [ ] 旅程 4（跨应用共享）通过，假外卖 dApp 中可见 SharedPIIRecord
- [ ] 旅程 5（consume_shared 销毁）通过，record 消失确认
- [ ] 零未修复的确定性失败
- [ ] 所有 L3-R 回归脚本通过（若有）

### 8.4 全局性能自检

- [ ] L1 同步函数 ≤ 100ms，异步函数 ≤ 500ms
- [ ] L3 旅程 1-3 ≤ 60s（mock 模式），旅程 4-5 ≤ 90s
- [ ] 无 N+1 record 扫描（每次操作只触发必要次数的 requestRecordPlaintexts）

### 8.5 安全自检

- [ ] 无任何 PII 明文出现在控制台日志（`console.log` 审查）
- [ ] 无任何 view key / private key 出现在前端代码或源码仓库
- [ ] `consume_shared` 在所有成功读取 SharedPIIRecord 的路径后均被触发
- [ ] 错误处理路径中 PII 明文不被写入 Error 对象的 `message` 字段

---

*文档版本：draft | 最后更新：2026-05-26*
*相关文档：[[04-interop-standard]] | [[05-wallet-integration]]*
