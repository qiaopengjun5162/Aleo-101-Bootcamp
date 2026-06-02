---
doc: 02-data-model
phase: 4
status: stable
last_review: 2026-05-29
related: [[03-program-interface]]
---

# 02 — 数据模型规范

> 事实依据：[[_research/aleo-status-2026-05]]。所有 Leo 代码片段符合 Leo 4.x 语法。

---

## 1. 设计哲学：为什么选 record，而非 mapping

### Record 的三大原生能力

| 能力 | 说明 |
|------|------|
| **自动加密** | record 的所有 `private` 字段在 transaction 广播时由 Aleo 协议层用 owner 的公钥加密，开发者无需写任何加密代码 |
| **所有权清晰** | `owner: address` 字段直接绑定"谁能读这条数据"；UTXO 模型让所有权转移变成 consume + mint |
| **撤销原生支持** | 将旧 record consume 掉即可让它"失效"，无需链上删除接口 |

### `mapping<address, PiiData>` 方案的核心缺陷

若用 `mapping<address, PiiData>` 存储 PII，则：

- **数据明文上链**：mapping 的值只有 `public` 语义，全网任何人都能读取，完全违背 PII 隐私目标
- **单地址单值**：一个用户只能有一条 PII，无法存储多个手机号/地址
- **无细粒度授权**：无法向第三方 dApp 授权"仅读一次"并在到期后自动失效
- **无法按字段选择性共享**：整条 mapping 值要么全给，要么不给

**结论**：PII 协议必须以 record 为核心存储单元。mapping 仅用于辅助计数或撤销名单（见 [[03-program-interface]]）。

---

## 2. 核心 Struct 与 Record Schema

### 2.1 `PIIPayload` struct

`PIIPayload` 是纯数据载体，不含 owner 语义，可被嵌入多种 record。

**字段设计决策**：

- `category: u8` — 区分 PII 类型，避免解析歧义
- `label_lo` + `label_hi: u128` — 合计 32 字节（256-bit），足以容纳 32 字节 ASCII 或约 10 个 CJK 字符的 UTF-8 标签（"家"/"公司"/"快递收货"等）
- `data: [u128; 13]` — 主数据区，13 × 16 = **208 字节**；覆盖典型地址（200 字节上限）和邮箱（254 字节 RFC 5321 上限需截断，但实务中 100 字节已足够）
- `data_len: u32` — 实际有效字节数，防止 padding 零字节导致解析歧义

**N = 13 的推导**：
- 门牌地址（中国最长）：省+市+区+街道+小区+楼号+单元+门牌 ≈ 100–200 中文字符 → UTF-8 最多 600 字节
- 协议限制：单 record 字段数上限保守估计 20 个；`[u128; 13]` 占 13 个槽位，加上其余字段正好 ≤ 20
- 实务取舍：**208 字节足以覆盖 99% 的真实地址**；超长地址（如带楼层备注的快递地址）建议客户端截断至 208 字节或另开 `category=3`（custom）第二条 record 续存
- 电话/邮箱场景：`[u128; 13]` 远超所需，`data_len` 字段明确实际长度，padding 空间不浪费

```leo
// pii_protocol_v1.aleo — PIIPayload struct 定义

struct PIIPayload {
    // PII 类型：0=address 1=phone 2=email 3=custom
    category: u8,

    // 用户自定义标签（UTF-8 打包，32 字节总量）
    // label_lo: 低 16 字节；label_hi: 高 16 字节
    label_lo: u128,
    label_hi: u128,

    // 主数据区：13 × 16 = 208 字节，满足地址/邮箱等最大场景
    data: [u128; 13],

    // 实际有效字节数（0 ~ 208），防止 padding 歧义
    data_len: u32,
}
// 总字段数：17（含嵌入到 record 时的 owner / meta 字段，全部 <= 20）
```

> **字段数核查**：PIIPayload 本身 17 个字段（1 + 2 + 13 + 1）。嵌入 PIIRecord 后，加上 owner/version/created_at/nonce 共 4 个外层字段，总字段数 = 17 + 4 = **21**。Leo 编译器的实际限制尚无官方精确文档（调研期间未找到"record 字段数硬上限"的权威来源）。**待 Phase 1 实测确认**：若编译报错，可将 `data: [u128; 13]` 缩减为 `[u128; 10]`（160 字节），或将 `label_lo/label_hi` 合并为 `label: [u128; 2]`（减少 1 个顶层字段）。

---

### 2.2 `PIIRecord` record

用户自有的 PII 条目。`owner` 字段触发 Aleo 协议自动用 owner 公钥加密所有 private 字段。

```leo
// pii_protocol_v1.aleo — PIIRecord record 定义

record PIIRecord {
    // ── Aleo 协议必填字段 ──
    owner: address,              // 标准 record 所有权字段（private，协议自动加密）

    // ── 业务字段（全部默认 private）──
    payload: PIIPayload,         // 实际 PII 数据（嵌套 struct，Leo 4.x 支持）

    version: u8,                 // schema 版本号，当前值 = 1u8
    created_at: u64,             // 创建时的 block height（由客户端传入，transition 不读链状态）
    nonce: field,                // 随机 nonce，防止两条内容相同的 record 产生相同 commitment
}
```

**字段语义说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `owner` | `address` | 标准 record 字段，由协议自动处理加密；写 `self.signer` 即可（跨程序调用时确保 record 归属最终用户） |
| `payload` | `PIIPayload` | 所有 PII 实际数据，嵌套 struct 形式 |
| `version` | `u8` | 当前版本 = `1u8`；未来升级部署新 program 时用于兼容判断 |
| `created_at` | `u64` | 客户端传入创建时刻的 block height，不可伪造（用户可验证时序） |
| `nonce` | `field` | 调用 `ChaCha::rand_field()` 生成；保证即使两条 payload 完全相同，record commitment 也不同 |

---

### 2.3 `SharedPIIRecord` record

用户授权给第三方后生成的临时 record。`owner` 设为接收方地址，触发 Aleo 协议自动用接收方公钥加密——这是范式 A 的核心。

```leo
// pii_protocol_v1.aleo — SharedPIIRecord record 定义

record SharedPIIRecord {
    // ── Aleo 协议必填字段 ──
    owner: address,              // 接收方地址（协议自动用接收方公钥加密全部 private 字段）

    // ── 业务字段（全部默认 private）──
    payload: PIIPayload,         // 共享的 PII 数据（与原 PIIRecord.payload 内容相同）

    sender: address,             // 共享发起人地址（透明可见，作为来源证据；接收方可验证）
    shared_at: u64,              // 共享时的 block height
    expires_at: u64,             // 过期 block height；超过此值后接收方应自行销毁，拒绝使用
    purpose: u128,               // 共享用途代码（见下方用途码约定）
}
```

**`purpose` 用途码约定**（链下约定，链上不校验；客户端 SDK 负责渲染）：

| 值（u128） | 语义 |
|-----------|------|
| `1u128` | 外卖配送 |
| `2u128` | 快递寄件 |
| `3u128` | 邮件邮寄 |
| `4u128` | 商户核验 |
| `0u128` | 通用/未指定 |
| `≥1000u128` | 自定义（dApp 自行解释） |

**`expires_at` 设计约束**：

- 客户端在调用 `share_pii` 时必须传入 `expires_at > shared_at`，否则 transition 内部 `assert` 失败
- 建议默认值：`shared_at + 50400u64`（约 7 天，按 Aleo ~12 秒/block 估算）
- 协议层不强制销毁过期 record；接收方 dApp 应在检测到 `block_height > expires_at` 时拒绝使用并调用 `consume_shared`

---

## 3. UTF-8 打包与解包策略

### 3.1 打包逻辑（客户端 → 链上）

客户端（TypeScript/JavaScript）将任意 UTF-8 字符串编码为 `[u128; 13]` 数组：

```typescript
// 伪代码：将 UTF-8 字符串打包为 u128 数组
function packUtf8ToU128Array(
  text: string,
  slots: number = 13        // data 数组长度
): { data: bigint[]; dataLen: number } {
  const bytes = new TextEncoder().encode(text);  // UTF-8 字节数组
  const maxBytes = slots * 16;

  // 错误处理策略：超长截断（见 3.3 节）
  const usedBytes = bytes.slice(0, maxBytes);
  const dataLen = usedBytes.length;

  const result: bigint[] = new Array(slots).fill(0n);

  for (let slot = 0; slot < slots; slot++) {
    let value = 0n;
    for (let byte = 0; byte < 16; byte++) {
      const idx = slot * 16 + byte;
      const b = idx < usedBytes.length ? BigInt(usedBytes[idx]) : 0n;
      // 小端：最低有效字节放在最低 8 位
      value |= b << BigInt(byte * 8);
    }
    result[slot] = value;
  }

  return { data: result, dataLen };
}

// label 字段（32 字节 = label_lo + label_hi）
function packLabel(label: string): { lo: bigint; hi: bigint } {
  const { data } = packUtf8ToU128Array(label, 2);
  return { lo: data[0], hi: data[1] };
}
```

### 3.2 解包逻辑（链上 → 客户端）

```typescript
// 伪代码：从 u128 数组还原 UTF-8 字符串
function unpackU128ArrayToUtf8(
  data: bigint[],
  dataLen: number
): string {
  const bytes: number[] = [];

  for (let slot = 0; slot < data.length; slot++) {
    const value = data[slot];
    for (let byte = 0; byte < 16; byte++) {
      const idx = slot * 16 + byte;
      if (idx >= dataLen) break;
      bytes.push(Number((value >> BigInt(byte * 8)) & 0xFFn));
    }
  }

  // 截断到 dataLen 后解码
  return new TextDecoder('utf-8', { fatal: false }).decode(
    new Uint8Array(bytes.slice(0, dataLen))
  );
}
```

### 3.3 错误处理策略

| 场景 | 策略 | 理由 |
|------|------|------|
| 输入超过 208 字节 | **截断到 208 字节**（按 UTF-8 字符边界截断，不切断多字节序列） | 拒绝意味着用户无法存储合法地址；截断比乱码更安全 |
| 输入超过 32 字节（label） | 截断到 32 字节 | label 是辅助显示，不是合同文本 |
| `dataLen` 为 0 | 允许，表示空值 | 某些字段可合法为空（如无标签） |
| 解包遇到非法 UTF-8 序列 | `TextDecoder` 替换模式（`fatal: false`）替换为 `U+FFFD` | 数据已上链无法修改，显示替换符比崩溃好 |
| `dataLen > slots * 16` | 客户端截断到 `slots * 16` 并警告 | 防御性处理，正常路径不会触发 |

**按字符边界截断的实现**：在截断点向前扫描，找到不处于 UTF-8 多字节序列中间的位置（即字节值 < 0x80 或 >= 0xC0 的位置）。

---

## 4. Schema 版本升级机制

> 对应 Phase 3 规划："schema 版本升级机制落地"（见 [[00-vision]]）。本节定义版本语义、兼容策略、迁移路径和破坏性变更判定规则。

### 4.1 Version Semantics

- `version: u8` 字段存在于 `PIIRecord` 中，跟踪创建该 record 时所用的 schema 版本
- **当前版本**：`version=1`，对应 `PIIPayload` 结构为 `[u128; 13]` 数据区 + `category` + `label_lo` + `label_hi` + `data_len`
- `create_pii` transition 内部通过 `assert_eq(version, 1u8)` 强制只接受 v1 schema
- `version` 由客户端在调用 `create_pii` 时传入，program 内部断言校验

```leo
// create_pii 内部版本断言（当前仅接受 v1）
assert_eq(version, 1u8);
```

> **设计决策**：`version` 是 record 级字段而非 program 级常量——这样同一个 program 理论上可以处理多版本 record（但本协议不推荐此模式，见 §4.4 禁止的升级方式）。

### 4.2 Forward Compatibility Strategy

#### Within-version extensibility（非破坏性扩展）

在不改变 struct 字段结构的前提下，以下变更**无需 program 升级**：

- **新增 `category` 值**：在 `PIIPayload.category` 枚举中追加新值（5, 6, ...），只需更新客户端 SDK 的类别映射表，链上 program 无需修改
- **新增 `purpose` 值**：在 `SharedPIIRecord.purpose` 用途码中追加新值，同理仅客户端变更
- **语义重新解释**：保持字段类型和数量不变，仅在 SDK 层变更解析逻辑（如 `category=4` 从"未定义"改为"社保号"）

#### Breaking schema changes（破坏性变更）

以下变更**必须创建新版本号和新 transition**：

- 数据数组大小变化（如从 `[u128; 13]` 扩展到 `[u128; 20]`）
- 新增或删除 struct 字段
- 字段类型变更（如 `data_len: u32` 改为 `data_len: u64`）

#### Version-specific transitions（版本隔离 transition）

每个 schema 版本获得独立的 transition 集合，保持类型安全：

- v1：`create_pii`, `update_pii`, `delete_pii`, `share_pii`, `consume_shared`, `mark_revoked`
- v2（未来）：`create_pii_v2`, `update_pii_v2`, `delete_pii_v2`, `share_pii_v2`, `consume_shared_v2`, `mark_revoked_v2`
- 不同版本的 transition 使用各自的 struct 定义，避免同一 transition 内分支处理不同 schema

#### 原因：Aleo program 的不可变性

Aleo program 部署后不可原地修改（`@noupgrade` 语义）。添加新 transition 或修改 struct 定义，本质上等同于部署一个新 program。因此：

- 同一 program 内无法追加新的 transition 签名
- 版本升级 = 新 program 部署
- 旧 program 的 record 在 UTXO 模型下永远可读（owner view key 可解密历史 record）

### 4.3 Migration Path

从 v1 升级到 v2 的标准迁移流程：

1. **部署新 program**：`pii_protocol_v2.aleo`，包含 v2 struct 定义和全套 v2 transition
2. **用户创建新 record**：通过 `create_pii_v2` 在新 program 上创建符合 v2 schema 的 record
3. **旧 record 保持有效**：`pii_protocol_v1.aleo` 上的历史 record 继续存在于链上，owner 可随时用 view key 解密读取；消费者在迁移期间必须**同时查询两个 program**
4. **SDK 多 program 扫描**：客户端 SDK 提供 program ID 列表常量，自动扫描所有版本的 record

```typescript
// SDK 常量示例：多 program 扫描
export const PII_PROGRAM_IDS = [
  'pii_protocol_v1.aleo',
  'pii_protocol_v2.aleo',
  // 未来版本继续追加
];
```

5. **迁移工具**（可选）：SDK 提供 `migrateV1ToV2(oldRecord)` 辅助函数，内部执行：
   - 用 owner view key 解密 v1 record 明文
   - 将明文重新编码为 v2 schema 格式
   - 调用 `delete_pii`（v1 program）销毁旧 record
   - 调用 `create_pii_v2`（v2 program）创建新 record
   - 使用 `requestBulkTransactions` 将两笔交易合并为一次用户授权

### 4.4 Rules for Breaking vs Non-Breaking Changes

| Change Type | Breaking? | Action |
|-------------|-----------|--------|
| New `category` value | Non-breaking | Add to PIICategory enum in SDK; no program change needed |
| New `purpose` value | Non-breaking | Add to PIIPurpose enum in SDK; no program change needed |
| Larger data array (e.g., `[u128; 13]` -> `[u128; 20]`) | Breaking | New version number + new program deployment |
| New struct field | Breaking | New version number + new program deployment |
| Field type change | Breaking | New version number + new program deployment |
| New transition (same schema) | Breaking | Requires new program (Aleo programs are immutable after deployment) |
| New mapping | Non-breaking | Add to existing program if program is not `@noupgrade` |
| Client-only semantic reinterpretation | Non-breaking | SDK update only; no on-chain change |

### 4.5 Prohibited Upgrade Patterns

- **禁止**在同一 program 内用 `if version == 1 { ... } else if version == 2 { ... }` 分支处理不同 schema——会大幅增加电路复杂度和 gas 消耗，且不同 schema 的 record 无法在同一个 transition 签名中统一类型
- **禁止**省略首版 `constructor` 块——没有 constructor 的 program 无法被未来版本替代
- **禁止**在不部署新 program 的情况下修改已部署 program 的 struct 定义——Aleo 协议层不允许
- **禁止**客户端跳过 version 断言直接构造 transaction——必须始终传入正确 version 值，由链上 assert 校验

---

## 5. 为什么不用 `mapping<address, PiiData>` — 权衡说明

```
┌─────────────────────────────────────────────────────────────────┐
│              Record 方案 vs Mapping 方案对比                     │
├──────────────────┬───────────────────────┬──────────────────────┤
│ 维度             │ Record（本协议选择）    │ Mapping              │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 隐私性           │ 链上全程密文，仅 owner  │ 值 public 明文上链，  │
│                  │ 可解密                 │ 任何人可读           │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 多条 PII         │ 每用户可持有无限条      │ 单地址单值，需自建    │
│                  │ record                 │ list 结构            │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 授权共享         │ 原生 UTXO transfer，    │ 需要额外 permission  │
│                  │ 接收方自动获得加密副本  │ 表，逻辑复杂         │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 到期/撤销        │ `expires_at` 字段 +     │ 无原生 TTL；需要链上  │
│                  │ consume 原语           │ 定时任务（Aleo 无此  │
│                  │                        │ 机制）              │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 前端查询         │ 需 view key 扫描解密    │ 直接调 indexer REST  │
│                  │（略复杂）              │ API（便捷）          │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 适合 PII 场景    │ ✅ 是                  │ ❌ 否                │
└──────────────────┴───────────────────────┴──────────────────────┘
```

mapping 的唯一优势是查询便捷，但查询便捷和 PII 隐私保护直接矛盾。**记录型隐私数据必须用 record**。

mapping 在本协议中仅作辅助角色：计数（`records_count: address => u64`）和撤销名单（`revoked_nonces: field => bool`），详见 [[03-program-interface]]。

---

## 6. 已知限制

### 6.1 单条 PII 最大字节数

- `data` 字段：`13 × 16 = 208 字节`
- `label`（label_lo + label_hi）：`2 × 16 = 32 字节`
- **单条 PIIRecord 可承载的 UTF-8 数据上限：240 字节**
- 超过 208 字节的主数据建议：客户端截断，或将完整数据链下加密后在 `data` 中只存 ciphertext（链上 commitment 存于另一 `field` 字段，但当前 schema 未预留此字段，留待 v2）

### 6.2 record 数量

- Aleo 协议对单地址持有的 record 数量**没有硬性链上上限**
- 实践成本：每条 record 对应一次 `create_pii` transaction，产生 gas 消耗（约 3–10 millicredits/条）
- 前端扫描成本：record 数量越多，view key 扫描解密时间越长；建议单用户活跃 record 数控制在 100 条以内

### 6.3 `[u128; 13]` 在 Leo 编译器中的实际限制

- `MAX_ARRAY_ELEMENTS` 当前为 2048（Aleo Stack v4.6.0），`[u128; 13]` 远低于上限，无问题
- record 字段数上限：**待 Phase 1 实测**——调研期间未找到官方精确文档；PIIPayload 展开后 17 个字段，保守估计安全

### 6.4 ZK 电路大小与证明时延

- 嵌套 struct + `[u128; 13]` 数组的实际电路大小、变量数、约束数：**待 Phase 1 实测**
- 预期 proof 生成时延：低端设备 2–10 秒（基于 ARC-20 transfer_private 参照）；确切数字须在 testnet 上跑基准

---

## 附录：Leo 完整 Schema 片段（供 Phase 1 直接参考）

```leo
program pii_protocol_v1.aleo {

    // ─────────────────────────────────────────
    // Struct：PII 数据载体
    // ─────────────────────────────────────────
    struct PIIPayload {
        category: u8,          // 0=address 1=phone 2=email 3=custom
        label_lo: u128,        // 标签低 16 字节（UTF-8 小端打包）
        label_hi: u128,        // 标签高 16 字节
        data: [u128; 13],      // 主数据，208 字节容量
        data_len: u32,         // 实际有效字节数
    }

    // ─────────────────────────────────────────
    // Record：用户自有 PII 条目
    // ─────────────────────────────────────────
    record PIIRecord {
        owner: address,
        payload: PIIPayload,
        version: u8,
        created_at: u64,
        nonce: field,
    }

    // ─────────────────────────────────────────
    // Record：共享给第三方的临时 PII 副本
    // ─────────────────────────────────────────
    record SharedPIIRecord {
        owner: address,        // 接收方地址（触发协议自动加密给接收方）
        payload: PIIPayload,
        sender: address,       // 共享发起人（来源证据，接收方可用 view key 验证）
        shared_at: u64,
        expires_at: u64,
        purpose: u128,
    }

}
```
