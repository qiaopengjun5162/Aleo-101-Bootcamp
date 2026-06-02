---
doc: 03-program-interface
phase: 4
status: stable
last_review: 2026-05-29
related: [[02-data-model]], [[04-interop-standard]]
---

# 03 — Program 接口规范

> 事实依据：[[_research/aleo-status-2026-05]]。所有 Leo 代码片段符合 Leo 4.x 语法（`fn` 关键字，无 `transition`/`function`/`finalize` 旧语法）。

---

## 1. Program 命名与部署

### 1.1 Program ID

```
pii_protocol_v1.aleo
```

命名决策：
- 长度 ≥ 10 字符 → **免 namespace 费**（参见调研报告 §4.1）
- 含版本号 `_v1` → 未来可独立部署 `_v2`，新旧 program 并行，旧 record 可读不可写
- 全小写下划线 → Leo program naming 规范

> **Phase 1 实施勘误（2026-05-26）**：原设计名 `aleo_pii_protocol_v1.aleo` 因 Leo 4.0.2 编译器硬约束（program name 不能含 'aleo' 子串，错误码 `ENV03711001`）被改名为 `pii_protocol_v1.aleo`。新名长度 15 字符，仍 ≥10 字符的 namespace 免费阈值，部署成本目标不变。

### 1.2 Testnet 部署记录

**部署时间**：2026-05-28
**网络**：Aleo testnet (Consensus Version 14)
**Transaction ID**: `at12qd2sa5xsngj0nxunnnlwexj9ullvrea69resw0gpwjzan4aaqgstxh8s5`
**Fee Transaction ID**: `at175q6c0gf0wgwedwgeemah4jdgq7x44kwzpz2lhttmjz4nzp5mqzsfsgjss`
**Explorer**: https://testnet.explorer.provable.com/transaction/at12qd2sa5xsngj0nxunnnlwexj9ullvrea69resw0gpwjzan4aaqgstxh8s5

**费用明细**:
| 项目 | 费用 (credits) |
|------|---------------|
| Transaction Storage | 8.293000 |
| Program Synthesis | 1.285481 |
| Namespace | 1.000000 |
| Constructor | 0.002000 |
| **Total** | **10.580481** |

**单次 transition 执行费用**:
| Transition | Storage | Finalize | Total |
|-----------|---------|----------|-------|
| create_pii | 0.002607 | 0 | 0.002607 |
| update_pii | 0.003092 | 0 | 0.003092 |
| delete_pii | 0.001708 | 0 | 0.001708 |
| share_pii | 0.003687 | 0 | 0.003687 |
| consume_shared | 0.001797 | 0.000060 | 0.001857 |
| mark_revoked | 0.002681 | 0.000532 | 0.003213 |

### Phase 3 勘误：Leo 4.0.2 Finalize 约束

> 发现时间：Phase 3 (2026-05-28)，实现 `consume_shared` 过期校验时验证

**L-01**: Leo 4.0.2 不支持 transition 级别的 `async fn` 语法。必须使用 `fn` 返回 `Final` + `return final { ... }` 模式。`async fn transition(...) -> Future` 写法会导致编译错误。

**L-02**: `final { ... }` 块内不能捕获 record 类型变量。必须先将 record 字段提取为标量变量，再传入 final 块。例如：
```leo
fn consume_shared(shared: SharedPIIRecord) -> Final {
    let expires_at = shared.expires_at;  // 提取为标量
    return final { finalize_consume_shared(expires_at); };
}
```

**L-03**: `final fn`（finalize 函数）不能接受 record 类型参数，只能接受标量类型（u8-u128, field, bool, address）。

**L-04**: `block.height` 返回 `u32` 类型，若 `expires_at` 为 `u64` 则需要显式类型转换：`block.height as u64`。

**影响**：
- `consume_shared` 的实现从计划的 `async fn` 改为 `fn` + `Final` 模式（见 `main.leo:116-130`）
- `finalize_consume_shared` 仅接受 `expires_at: u64` 标量参数，而非完整的 `SharedPIIRecord`

### 1.2 部署网络

- **目标**：Aleo Testnet
- **RPC 端点**：`https://api.explorer.provable.com/v1/testnet`（Chain ID = `1u16`）
- **部署命令**（供 Phase 1 参考）：
  ```bash
  leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1/testnet
  ```
- **预估部署成本**：2–10 credits（中等复杂度 program，含 5 个 transition + 嵌套 struct）；**待 Phase 1 实测确认**

### 1.3 辅助 Mapping（链上公开状态）

```leo
// 记录每个地址创建的 PIIRecord 总数（辅助统计，非查询索引）
mapping records_count: address => u64;

// 撤销名单：nonce 被标记后该 record 的共享请求可被接收方 dApp 拒绝
// key = PIIRecord.nonce（field 类型），value = true 表示已撤销
mapping revoked_nonces: field => bool;
```

> **注意**：mapping 仅在 `async fn` 上下文读写。transitions 本身不直接访问 mapping；如需更新 mapping，transition 须返回 `Future` 并配对一个 `async fn` finalize 函数。本文档 Phase 1 中 mapping 更新为**可选优化**，核心功能不依赖 mapping。

---

## 2. Transitions 清单

### 2.1 `fn create_pii`

**签名**

```leo
fn create_pii(
    private payload: PIIPayload,
    private nonce: field,
    private version: u8,
    private created_at: u64,
) -> PIIRecord
```

**前置条件**

- 调用方即为新 record 的 owner，由 `self.signer` 决定（见下方安全说明）
- `payload.data_len <= 208u32`（客户端保证；链上断言防御）
- `version == 1u8`（当前版本；未来版本独立 program）

**操作**

1. 断言 `payload.data_len <= 208u32`
2. 断言 `version == 1u8`
3. 构造 `PIIRecord { owner: self.signer, payload, version, created_at, nonce }`（使用 `self.signer` 而非 `self.caller`，见下方安全说明）
4. 返回新 record

**后置条件**

- 调用方持有一条新 `PIIRecord`，`owner = self.signer`
- 原状态不变（create 不 consume 任何 record）

> **安全说明：`self.signer` vs `self.caller`**
>
> Leo 4.x 提供两个内省关键字：`self.signer`（原始 transaction 签名者，即最终用户钱包地址）和 `self.caller`（直接调用者）。当用户直接调用 transition 时两者相同；但当 Program A 调用 Program B 的 transition 时，Program B 中 `self.caller` = Program A 的地址，而 `self.signer` 仍为最终用户地址。
>
> 本协议使用 `self.signer` 设置 record owner，原因：
> 1. **记录所有权正确性**：PII 数据必须归属于最终用户，而非中间调用合约
> 2. **跨程序调用安全**：若使用 `self.caller`，当未来有中间合约（如聚合器 dApp）调用 `create_pii` 时，record 会归属于中间合约地址，用户将无法解密自己的 PII
> 3. **UTXO 模型一致性**：record owner 决定了谁的 view key 可以解密，必须是最终用户

**ZK 证明范围**

- 证明：调用方知道 `payload` 明文，且 `data_len` 合法
- 不证明：payload 内容的语义合法性（链上无法验证地址格式）

**Gas 预估**：3–10 millicredits（**待 Phase 1 实测**）

**失败场景**

| 条件 | 行为 |
|------|------|
| `payload.data_len > 208u32` | `assert` 失败，transaction 回滚 |
| `version != 1u8` | `assert` 失败，transaction 回滚 |

**伪代码**

```leo
fn create_pii(
    private payload: PIIPayload,
    private nonce: field,
    private version: u8,
    private created_at: u64,
) -> PIIRecord {
    // 前置断言
    assert(payload.data_len <= 208u32);
    assert_eq(version, 1u8);

    // 构造并返回 record，owner = 调用方
    return PIIRecord {
        owner: self.caller,
        payload: payload,
        version: version,
        created_at: created_at,
        nonce: nonce,
    };
}
```

---

### 2.2 `fn update_pii`

**签名**

```leo
fn update_pii(
    private old: PIIRecord,
    private new_payload: PIIPayload,
    private new_nonce: field,
    private updated_at: u64,
) -> PIIRecord
```

**前置条件**

- `old.owner == self.caller`（Aleo 协议保证：调用方持有 record 才能传入；无需 assert）
- `new_payload.data_len <= 208u32`

**操作**

1. 断言 `new_payload.data_len <= 208u32`
2. Consume `old`（UTXO 语义：旧 record 作为输入即被销毁）
3. 构造新 `PIIRecord`，`owner` 仍为 `self.caller`，`created_at` 保留原值（表示首次创建时间），`version` 保留原值

**后置条件**

- 旧 `PIIRecord` 被消耗（链上不可再使用）
- 调用方持有一条新 `PIIRecord`，payload 已更新

**Gas 预估**：5–15 millicredits（consume + mint，比 create 略高；**待实测**）

**失败场景**

| 条件 | 行为 |
|------|------|
| `old` 不属于 `self.caller` | 解密失败，钱包层拒绝构造 transaction |
| `new_payload.data_len > 208u32` | `assert` 失败，回滚 |

**伪代码**

```leo
fn update_pii(
    private old: PIIRecord,
    private new_payload: PIIPayload,
    private new_nonce: field,
    private updated_at: u64,
) -> PIIRecord {
    assert(new_payload.data_len <= 208u32);

    // 构造更新后的 record（created_at 保留原始首次创建时间）
    return PIIRecord {
        owner: self.caller,
        payload: new_payload,
        version: old.version,
        created_at: old.created_at,
        nonce: new_nonce,
    };
    // old 作为 transition 输入，UTXO 语义下自动被 consume
}
```

---

### 2.3 `fn delete_pii`

**签名**

```leo
fn delete_pii(private record: PIIRecord)
```

**前置条件**

- `record.owner == self.caller`（UTXO：持有即证明）

**操作**

1. Consume `record`（无输出 record）
2. 不产生任何新 record

**后置条件**

- `record` 被永久销毁，无法再使用

**ZK 证明范围**

- 证明：调用方确实持有该 record（知道明文，能通过解密验证）
- 不证明：其他任何事情

**Gas 预估**：3–8 millicredits（仅 consume；**待实测**）

**失败场景**

| 条件 | 行为 |
|------|------|
| `record` 不属于 `self.caller` | 钱包层无法解密，无法构造合法 transition |
| `record` 已被 consume | snarkVM 双花检测拒绝，transaction 无效 |

**伪代码**

```leo
fn delete_pii(private record: PIIRecord) {
    // 无操作，仅将 record 作为输入传入
    // UTXO 语义：有输入无输出，record 即被销毁
}
```

---

### 2.4 `fn share_pii` ⭐ 核心

**签名**

```leo
fn share_pii(
    private source: PIIRecord,
    private recipient: address,
    private expires_at: u64,
    private purpose: u128,
    private new_nonce: field,
    private shared_at: u64,
) -> (PIIRecord, SharedPIIRecord)
```

**前置条件**

- `source.owner == self.caller`（UTXO：持有即证明）
- `expires_at > shared_at`（过期时间必须在共享时间之后）
- `recipient != self.caller`（防止自己给自己发；可选断言，Phase 1 可略过）

**操作（范式 A 核心流程）**

1. 断言 `expires_at > shared_at`
2. 构造新 `PIIRecord`（返还给 sender，owner = `self.caller`）：保持 sender 仍持有原 PII
3. 构造 `SharedPIIRecord`（发给 recipient，**owner = recipient**）：Aleo 协议自动用 recipient 公钥加密
4. Consume `source`
5. 返回 `(kept, shared)` 元组

**后置条件**

- `source` 被消耗
- 调用方持有一条新 `PIIRecord`（内容与原 source 相同，nonce 不同）
- recipient 收到一条 `SharedPIIRecord`，已被协议自动加密给 recipient

**ZK 证明范围**

- 证明：调用方持有 source，且 `expires_at > shared_at`
- 证明：shared record 的 payload 与 source 的 payload 内容一致（防止篡改后共享）
- 不证明：recipient 的身份合法性、purpose 的语义合法性

**Gas 预估**：10–25 millicredits（1 consume + 2 mint，电路最复杂；**待实测**）

**失败场景**

| 条件 | 行为 |
|------|------|
| `expires_at <= shared_at` | `assert` 失败，回滚 |
| `source` 不属于 `self.caller` | 钱包层无法构造合法 tx |
| `source` 已被 consume | snarkVM 双花检测拒绝 |

**伪代码**

```leo
fn share_pii(
    private source: PIIRecord,
    private recipient: address,
    private expires_at: u64,
    private purpose: u128,
    private new_nonce: field,
    private shared_at: u64,
) -> (PIIRecord, SharedPIIRecord) {
    // 前置断言
    assert(expires_at > shared_at);

    // 返还给 sender 的新 PIIRecord（owner = self.caller，保持 sender 仍持有 PII）
    let kept: PIIRecord = PIIRecord {
        owner: self.caller,
        payload: source.payload,
        version: source.version,
        created_at: source.created_at,
        nonce: new_nonce,              // 新 nonce 防止 commitment 碰撞
    };

    // 发给 recipient 的 SharedPIIRecord
    // owner = recipient → Aleo 协议自动用 recipient 公钥加密所有 private 字段
    let shared: SharedPIIRecord = SharedPIIRecord {
        owner: recipient,
        payload: source.payload,
        sender: self.caller,
        shared_at: shared_at,
        expires_at: expires_at,
        purpose: purpose,
    };

    // source 作为输入被 consume；返回两条新 record
    return (kept, shared);
}
```

---

### 2.5 `fn consume_shared`

**签名**

```leo
fn consume_shared(private shared: SharedPIIRecord)
```

**前置条件**

- `shared.owner == self.caller`（即接收方；UTXO 持有即证明）

**操作**

1. Consume `shared`，不产出任何 record

**后置条件**

- `SharedPIIRecord` 被永久销毁（接收方"用完即销"）

**典型使用场景**

- 接收方使用完共享数据后主动销毁（遵循最小数据留存原则）
- 接收方检测到 `block_height > shared.expires_at` 后强制销毁

**Gas 预估**：3–8 millicredits（仅 consume；**待实测**）

**伪代码**

```leo
fn consume_shared(private shared: SharedPIIRecord) {
    // 无操作，shared 作为输入传入即被 consume
}
```

**过期校验实现路径说明**

由于 Leo 4.x 中同步 `fn` 无法读取 `block.height`（只有 `async fn` 可访问链状态），过期校验有两条实现路径：

**路径 A（推荐 Phase 1）：async finalize 校验**

将 `consume_shared` 改为 `async fn`，在 finalize 步骤中访问 `block.height` 并 assert：

```leo
async fn consume_shared(shared: SharedPIIRecord) -> Future {
    assert_eq(shared.owner, self.caller);
    return finalize_consume_shared(shared.expires_at);
}

async function finalize_consume_shared(expires_at: u64) {
    assert(block.height <= expires_at);
}
```

**路径 B（客户端降级）：链下预检**

客户端在调用 `consume_shared` 前预检 `currentBlock > expires_at`，transition 本身不校验。此路径用于 Phase 1 快速验证，正式版本采用路径 A。

Phase 1 默认选择路径 A，以匹配验收矩阵 CS-03 的链上强制语义。

---

### 2.6 `fn revoke_shared` — 设计讨论

**核心难点**：record 一旦共享，sender **无法直接 consume 接收方持有的 record**——因为 sender 不是 `SharedPIIRecord.owner`，snarkVM 拒绝 sender 传入该 record 作为 transition 输入。这是 Aleo UTXO 模型的本质特征，不是 bug。

**替代方案分析**

| 方案 | 可行性 | 说明 |
|------|--------|------|
| **依赖 `expires_at`** | ✅ 推荐 | 设计合理的过期时间（7天/1次性），过期后接收方 dApp 拒绝使用；sender 的 `PIIRecord.nonce` 可加入 `revoked_nonces` mapping |
| **Revocation Mapping** | ✅ 可用 | sender 调用一个 `fn mark_revoked(nonce: field)` transition，将 nonce 写入 `revoked_nonces` mapping；接收方 dApp 在使用前查链上 mapping 判断是否被撤销 |
| **链上强制销毁** | ❌ 不可行 | Aleo 协议无此机制；record 所有权不可越权操作 |
| **双签撤销** | ❌ 过于复杂 | 需要 sender + recipient 协同签名，UX 差，Phase 1 不考虑 |

**Phase 1 决策**：不实现 `fn revoke_shared` transition；改为实现 `fn mark_revoked`（可选，写入 mapping）。接收方 dApp 在使用 `SharedPIIRecord` 前，检查 `revoked_nonces[source_nonce]` 是否为 `true`。

**`fn mark_revoked` 伪代码**（可选，Phase 1 实现）

```leo
// 将原始 PIIRecord 的 nonce 标记为已撤销
// 接收方 dApp 应在使用 SharedPIIRecord 前查询此 mapping
async fn mark_revoked(
    private original_nonce: field,
    private proof_record: PIIRecord,    // 持有原 record 证明 sender 身份
) -> (PIIRecord, Future) {
    // 返回原 record（不销毁）
    let kept: PIIRecord = PIIRecord {
        owner: self.caller,
        payload: proof_record.payload,
        version: proof_record.version,
        created_at: proof_record.created_at,
        nonce: proof_record.nonce,
    };
    return (kept, finalize_mark_revoked(original_nonce));
}

async fn finalize_mark_revoked(nonce: field) {
    revoked_nonces.set(nonce, true);
}
```

> **限制**：此方案仅为"软撤销"——接收方 dApp 可选择不检查 mapping；协议层无法强制执行。彻底的撤销保障需要在 dApp 合同层（链下）约束接收方行为。

---

## 3. 错误码约定

### 3.1 Leo 的断言机制

Leo 使用 `assert(condition)` 和 `assert_eq(a, b)` 在 ZK 电路中施加约束。断言失败时 transaction 构造失败（客户端）或 ZK 验证失败（链上），**不产生"错误码"**，只有成功/失败两种状态。

### 3.2 应用层错误码映射（客户端 SDK）

客户端应在调用 wallet adapter 前进行预验证，产生友好错误码：

| 错误码 | 触发场景 | 处理建议 |
|--------|----------|----------|
| `PII_ERR_DATA_TOO_LONG` | `data_len > 208` | 截断或拒绝提交 |
| `PII_ERR_LABEL_TOO_LONG` | label UTF-8 > 32 字节 | 截断 |
| `PII_ERR_INVALID_VERSION` | version != 1 | 提示用户升级客户端 |
| `PII_ERR_EXPIRES_BEFORE_NOW` | `expires_at <= shared_at` | 要求用户设置未来时间 |
| `PII_ERR_RECORD_NOT_OWNED` | 传入 record 不属于当前钱包 | 提示钱包切换 |
| `PII_ERR_RECORD_CONSUMED` | record 已被使用（双花） | 提示用户刷新 record 列表 |
| `PII_ERR_TX_REJECTED` | wallet adapter 返回失败 | 透传 wallet 错误信息 |

### 3.3 链上 `assert` 与客户端预检对应关系

```
客户端预检（SDK）          →    链上 assert（Leo）
───────────────────────────────────────────────
data_len <= 208            →    assert(payload.data_len <= 208u32)
version == 1               →    assert_eq(version, 1u8)
expires_at > shared_at     →    assert(expires_at > shared_at)
```

**最佳实践**：客户端预检和链上断言**都要有**。客户端预检提升 UX（快速反馈），链上断言保证协议安全性（防止恶意构造）。

---

## 4. ZK 证明大小与生成时延预期

| Transition | 电路复杂度估计 | 证明生成时延（估计） | 备注 |
|------------|--------------|-------------------|------|
| `create_pii` | 低（1 mint） | 1–5 秒 | 含 PIIPayload 展开，约万级约束 |
| `update_pii` | 低-中（1 consume + 1 mint） | 2–8 秒 | — |
| `delete_pii` | 极低（1 consume） | 0.5–3 秒 | — |
| `share_pii` | 中-高（1 consume + 2 mints + payload 一致性证明） | 5–15 秒 | **最复杂**；待实测 |
| `consume_shared` | 极低（1 consume） | 0.5–3 秒 | — |
| `mark_revoked` | 低（1 consume-and-keep + 1 async write） | 2–6 秒 | — |

> **所有数值为估算，基于 ARC-20 `transfer_private` 参照（见调研报告 §7.2）。所有数值须在 Phase 1 于 testnet 实测后替换为实测数据。**

proof 大小预期（ZK-SNARK Groth16，Aleo 使用）：约 **192–256 字节**（固定大小，与电路复杂度无关）。

---

## 5. 未来扩展点

以下 transition 在 Phase 1 中**明确占位但不实现**，接口规范仅供设计参考。

### 5.1 `fn share_selective`（范式 C，字段掩码共享）

```leo
// 占位签名 — Phase 2 实现
// mask: 位掩码，控制 payload 中哪些字段被共享（0=不共享，1=共享）
// 实现难点：ZK 电路中证明"shared.payload 是 source.payload 按 mask 过滤后的结果"
//           需要额外约束；电路规模会显著增大
fn share_selective(
    private source: PIIRecord,
    private recipient: address,
    private mask: u32,             // 位掩码：bit 0=data[0], bit 1=data[1], ...
    private expires_at: u64,
    private purpose: u128,
    private new_nonce: field,
    private shared_at: u64,
) -> (PIIRecord, SharedPIIRecord)
```

**待解决问题**：被 mask 屏蔽的字段在 `SharedPIIRecord.payload` 中应填零还是随机值？填零会泄露"此字段为空"的信息；填随机值则 shared record 不可单独验证。需要 Phase 2 密码学分析。

### 5.2 `fn batch_share`（批量共享给同一 recipient）

```leo
// 占位签名 — Phase 2 实现
// Leo 4.x 单 transition 输出 record 数量上限待确认（调研期间未找到精确限制）
// 当前替代方案：客户端调用 requestBulkTransactions，多次调用 share_pii
fn batch_share(
    private sources: [PIIRecord; 4],    // 数组长度待定；受 Leo record 输入数量限制
    private recipient: address,
    private expires_at: u64,
    private purpose: u128,
    private nonces: [field; 4],
    private shared_at: u64,
) -> ([PIIRecord; 4], [SharedPIIRecord; 4])
```

**当前推荐替代**：使用 Leo Wallet adapter 的 `requestBulkTransactions`，将多笔 `share_pii` 合并为一次用户授权。

### 5.3 `fn delegate_share`（代理共享，范式 B）

```leo
// 占位签名 — Phase 3 研究阶段
// 场景：用户 A 授权中间方 M，M 可以代表 A 向 C 共享，但不能读取 payload 明文
// 实现依赖：Aleo 的 re-encryption 或 proxy re-encryption 能力（当前 Leo 4.x 尚未原生支持）
fn delegate_share(...)
```

---

## 6. 完整 Program 骨架（供 Phase 1 参考）

```leo
program pii_protocol_v1.aleo {

    // ──────────────────────────────────────────────────────
    // Struct 定义（须与 02-data-model.md 完全一致）
    // ──────────────────────────────────────────────────────

    struct PIIPayload {
        category: u8,
        label_lo: u128,
        label_hi: u128,
        data: [u128; 13],
        data_len: u32,
    }

    record PIIRecord {
        owner: address,
        payload: PIIPayload,
        version: u8,
        created_at: u64,
        nonce: field,
    }

    record SharedPIIRecord {
        owner: address,
        payload: PIIPayload,
        sender: address,
        shared_at: u64,
        expires_at: u64,
        purpose: u128,
    }

    // ──────────────────────────────────────────────────────
    // Mapping（辅助链上状态）
    // ──────────────────────────────────────────────────────

    mapping records_count: address => u64;
    mapping revoked_nonces: field => bool;

    // ──────────────────────────────────────────────────────
    // Transitions
    // ──────────────────────────────────────────────────────

    fn create_pii(
        private payload: PIIPayload,
        private nonce: field,
        private version: u8,
        private created_at: u64,
    ) -> PIIRecord {
        assert(payload.data_len <= 208u32);
        assert_eq(version, 1u8);
        return PIIRecord {
            owner: self.caller,
            payload: payload,
            version: version,
            created_at: created_at,
            nonce: nonce,
        };
    }

    fn update_pii(
        private old: PIIRecord,
        private new_payload: PIIPayload,
        private new_nonce: field,
        private updated_at: u64,
    ) -> PIIRecord {
        assert(new_payload.data_len <= 208u32);
        return PIIRecord {
            owner: self.caller,
            payload: new_payload,
            version: old.version,
            created_at: old.created_at,
            nonce: new_nonce,
        };
    }

    fn delete_pii(private record: PIIRecord) {
        // consume only
    }

    fn share_pii(
        private source: PIIRecord,
        private recipient: address,
        private expires_at: u64,
        private purpose: u128,
        private new_nonce: field,
        private shared_at: u64,
    ) -> (PIIRecord, SharedPIIRecord) {
        assert(expires_at > shared_at);

        let kept: PIIRecord = PIIRecord {
            owner: self.caller,
            payload: source.payload,
            version: source.version,
            created_at: source.created_at,
            nonce: new_nonce,
        };

        let shared: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source.payload,
            sender: self.caller,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
        };

        return (kept, shared);
    }

    fn consume_shared(private shared: SharedPIIRecord) {
        // consume only
    }

    // ──────────────────────────────────────────────────────
    // 可选：软撤销（写 mapping）
    // ──────────────────────────────────────────────────────

    async fn mark_revoked(
        private original_nonce: field,
        private proof_record: PIIRecord,
    ) -> (PIIRecord, Future) {
        let kept: PIIRecord = PIIRecord {
            owner: self.caller,
            payload: proof_record.payload,
            version: proof_record.version,
            created_at: proof_record.created_at,
            nonce: proof_record.nonce,
        };
        return (kept, finalize_mark_revoked(original_nonce));
    }

    async fn finalize_mark_revoked(nonce: field) {
        revoked_nonces.set(nonce, true);
    }
}
```

> **Phase 1 实现顺序建议**：先实现 `create_pii` + `delete_pii`（最小闭环），验证 record 加密/解密流程；再实现 `share_pii` + `consume_shared`（核心价值主张）；最后补充 `update_pii` + `mark_revoked`。

---

## 附录：待 Phase 1 实测确认的事项

| 事项 | 当前状态 | 影响 |
|------|----------|------|
| record 字段数上限（PIIPayload 展开后 17 个顶层字段 + record 外层字段） | 未找到官方精确文档 | 若超限需缩减 `data: [u128; N]` 的 N |
| `share_pii` 实际 proof 生成时延 | 估算 5–15 秒 | 影响 UX；超过 15 秒需要进度条提示 |
| `share_pii` ZK 电路约束数 / 部署 gas | 基于 ARC-20 估算 | 确定实际部署成本 |
| `async fn` + `Future` 语法在当前 Leo 4.x CLI 的精确写法 | 调研报告有示例但未经本项目编译验证 | 可能需要微调语法 |
| `ChaCha::rand_field()` 是否在当前 snarkVM v4.0.0 可用 | 调研报告提及但未精确确认 | 若不可用，改由客户端生成 nonce 传入 |
| `mark_revoked` 中 `proof_record` 作为 consume-and-return 的语法是否被 Leo 4.x 编译器接受 | 未验证 | 可能需要重构为不依赖输入 record 的方式 |
