---
doc: 04-interop-standard
phase: 4
status: needs-update
last_review: 2026-05-29
related: [[03-program-interface]], [[02-data-model]], [[05-wallet-integration]]
---

# Aleo PII Protocol — 跨应用互通标准

> **本文件是协议规范**，非教程。所有规范性用语（MUST / SHOULD / MAY / MUST NOT）遵循 RFC 2119。
> 相关文档：[[05-wallet-integration]] | [[06-acceptance-criteria]]

---

## 目录

1. [互通问题陈述](#1-互通问题陈述)
2. [范式 A — 完整流程](#2-范式-a--完整流程)
3. [标准请求格式](#3-标准请求格式)
4. [标准响应格式](#4-标准响应格式)
5. [第三方 dApp 接入 Checklist](#5-第三方-dapp-接入-checklist)
6. [互通中的 UX 规范](#6-互通中的-ux-规范)
7. [安全规范](#7-安全规范)
8. [反模式](#8-反模式)
9. [未来扩展占位](#9-未来扩展占位)

---

## 1. 互通问题陈述

### 1.1 为什么传统 REST API 不适用 Aleo

在传统 Web2 架构中，个人信息（PII）通常由后端服务集中存储，dApp 通过 REST API 向后端请求用户数据。这一模式在 Aleo 的隐私语义下根本性地失效：

**隐私破坏路径**：

1. **明文暴露**：REST API 要求服务端持有用户数据明文。任何请求该 API 的第三方都绕过了 Aleo 协议层的密码学保护，明文以 HTTP 响应形式流转，其隐私性完全降级为传统 API 密钥管理水平。

2. **链上记录与链下授权语义割裂**：Aleo PII record 的所有权由链上 `owner: address` 字段的密码学保证确定。REST API 无法表达、无法继承此所有权——它引入了一个链下信任边界，本质上是在绕过 Aleo 隐私模型。

3. **无法实现最小披露**：REST 通常返回完整资源（包含用户全量信息）。Aleo 的 record 模型允许精确控制"哪个 category 的 PII 共享给哪个 program"，这一能力只有在 program-level interface 层面才能被利用。

4. **审计链断裂**：record 的 consume/share 历史原生存在于链上，所有 transition 可被双方 view key 追溯；REST API 路径的操作审计完全依赖中心化日志，不可信。

### 1.2 为什么必须用 program-level interface

**规范性结论**：Aleo PII Protocol 的所有跨应用 PII 流转操作，MUST 通过 on-chain program transition 完成，不得通过链下 API 传递 PII 明文或 ciphertext。

理由如下：

| 能力 | REST API | Program-level Interface |
|------|---------|------------------------|
| 用户授权的密码学强制性 | 无 | 有（transition 需要 owner 私钥签名） |
| 最小披露（按 category 授权） | 无 | 有（每次 share_pii 明确 category + purpose） |
| 自动失效（有效期） | 需自行实现 | `expires_at` 字段由链上逻辑强制 |
| 即用即销毁语义 | 无 | `consume_shared` 强制销毁 |
| 可审计的访问记录 | 中心化 | 链上不可篡改 |
| 防止二次转发 | 无法强制 | 协议层可通过设计限制（见 7.2）|

---

## 2. 范式 A — 完整流程

### 2.1 定义

范式 A（User-Authorized Re-encryption）是 Aleo PII Protocol 的核心互通范式：

> 用户持有 `PIIRecord`（`owner = user_address`）。当用户授权第三方 dApp 读取某类 PII 时，用户在客户端解密原 record，调用 `share_pii` transition，将接收方地址作为新 record 的 `owner`，Aleo 协议自动用接收方公钥加密整条 `SharedPIIRecord`，接收方获得的 record 仅其地址对应的 view key 可解密。

### 2.2 序列图

```
RequesterDApp            User Wallet              User          Aleo Program (pii_protocol_v1.aleo)      Chain
      |                       |                    |                       |                           |
      |--- ShareRequest ----→ |                    |                       |                           |
      |    {category,         |                    |                       |                           |
      |     purpose,          |                    |                       |                           |
      |     requester_address,|                    |                       |                           |
      |     expires_in_blocks,|                    |                       |                           |
      |     display_name,     |                    |                       |                           |
      |     display_purpose}  |                    |                       |                           |
      |                       |-- 弹窗授权确认 ---→ |                       |                           |
      |                       |   "是否共享        |                       |                           |
      |                       |   【家庭地址】给    |                       |                           |
      |                       |   【XX外卖】，      |                       |                           |
      |                       |   用途：订单配送，  |                       |                           |
      |                       |   有效期：100块"    |                       |                           |
      |                       |                    |--- 确认 ---→          |                           |
      |                       |                    |                       |                           |
      |                       |←-- 触发 requestTransaction -----------------|                           |
      |                       |    share_pii(                               |                           |
      |                       |      source: PIIRecord,                    |                           |
      |                       |      recipient: requester_address,          |                           |
      |                       |      expires_at: current_block + expires_in_blocks,                    |
      |                       |      purpose: encoded_purpose,              |                           |
      |                       |      new_nonce: rand_field,                 |                           |
      |                       |      shared_at: current_block               |                           |
      |                       |    )                                        |                           |
      |                       |                                             |--- 执行 transition -----→|
      |                       |                                             |                          |
      |                       |                                             |←-- emit: ------------------|
      |                       |                                             |    PIIRecord(owner=user)  |
      |                       |                                             |    SharedPIIRecord        |
      |                       |                                             |    (owner=requester)      |
      |                       |                                             |                          |
      |←--- 交易确认 tx_id ---|                                             |                          |
      |                                                                     |                          |
      |--- requestRecordPlaintexts('pii_protocol_v1.aleo') -------→  |                          |
      |                       |                    |                       |                           |
      |                       |←-- (钱包扫描链，用 view key 试解密) ---------|                          |
      |                       |                    |                       |                           |
      |←--- 解密后的 SharedPIIRecord payload ----- |                       |                           |
      |                                                                     |                          |
      |--- requestTransaction(consume_shared, shared_record) ----------→   |                          |
      |                       |                    |                       |--- 销毁 record ----------→|
      |                       |                    |                       |                           |
      |    （PIIPayload 已在本地处理完毕）           |                       |                           |
```

### 2.3 关键约束

**C1（所有权不变性）**：`share_pii` transition MUST 同时产出两条 record：一条 `PIIRecord`（`owner = self.caller`）和一条 `SharedPIIRecord`（`owner = recipient`）。原始 record 被消耗（UTXO spent），用户获得新 record 以保证其 PII 不因共享而丢失。

**C2（协议自动加密）**：开发者 MUST NOT 自行实现字段加密逻辑。Aleo 协议在 transition 输出 record 时，用 `owner` 字段对应的公钥自动派生 shared key 并加密所有 private 字段。

**C3（有效期强制）**：`expires_at: u64`（block height）MUST 由链上逻辑校验，`consume_shared` 时若 `block.height > expires_at` 则 transition MUST 失败。

**C4（consume 强制语义）**：接收方在读取 `SharedPIIRecord` 明文后，MUST 调用 `consume_shared` 销毁该 record。本协议将此设为**强制语义**而非建议——不销毁意味着明文 PII 的权利在链上永久留存，违反最小必要原则（详见 2.4 决策记录）。

**C5（目的编码）**：`purpose` 字段使用 `u128` 枚举值，第三方 dApp 共享请求中的 `display_purpose` 为 UI 呈现字段，不上链；`purpose` 枚举由本协议维护（见 3.3）。

### 2.4 决策记录：consume_shared 是否强制？

**决策**：**强制**（Normative MUST）。

**论据**：

Aleo PII Protocol 的设计目标之一是"即用即销毁"，以实现 PII 访问的最小暴露窗口。将 consume_shared 定义为 MUST 的理由：

1. **链上状态清洁**：`SharedPIIRecord` 一旦不被 consume，它永久存在于 recipient 地址下（虽然其他人看不见，但 recipient 随时可重新解密）。这违反了"单次授权单次使用"的意图。

2. **可审计性**：强制 consume 意味着"已读"这个事件有链上 proof。如果接收方没有 consume，双方都知道数据还处于"可用"状态，用户可决定是否撤销（通过 revocation mapping）。

3. **设计一致性**：UTXO record 模型本身就是"用则消耗"的语义，强制 consume 是对该范式的正确使用，而不是反模式。

**折中**：协议定义强制语义，但 SDK 层面提供 `consumeAfterRead(sharedRecord)` 工具函数，在成功读取 payload 后自动提交 `consume_shared` transaction，减少接入方遗漏的概率。

> **注意（C4 执行机制）**：强制 MUST 的执行依赖 SDK 层的 `consumeAfterRead` 封装。链上无法物理阻止接收方不调用 consume，因此 C4 是"语义强制"而非"技术强制"。Phase 1 通过 SDK 工具函数 `consumeAfterRead` 自动串联读取与销毁来落地此约束。

---

## 3. 标准请求格式

### 3.1 背景

Aleo 生态目前没有统一的跨 dApp 消息总线标准（类比 EIP-1193 之于以太坊）。本协议定义一个 **JSON-RPC 风格**的请求 schema，用于 RequesterDApp 向用户钱包（或中间层 broker）发起 PII 共享请求。

此 schema 作为**建议标准**（informative）发布，待社区采用后可提升为规范性标准。

### 3.2 PIIShareRequest Schema

```typescript
interface PIIShareRequest {
  // 协议版本，当前为 "1.0"
  version: "1.0";

  // 请求的 PII 类别（见 3.3）
  category: PIICategory;

  // 用途枚举值（见 3.4），上链字段
  purpose: PIIPurpose;

  // 接收方 Aleo address（requester dApp 的地址）
  requester_address: string;  // aleo1... 格式

  // 共享有效期（块数）。建议值：短期 100 块 ≈ 10 分钟；长期 50000 块 ≈ 5 天
  // 乘以 block 数后转为 `u64` 类型传入 transition
  expires_in_blocks: number;

  // UI 展示字段（不上链）
  display_name: string;       // dApp 名称，如 "XX DAO"，最长 64 字符
  display_purpose: string;    // 人类可读用途说明，如 "地址确认"，最长 128 字符

  // 可选：dApp 的隐私政策 URL（用于钱包弹窗展示）
  privacy_policy_url?: string;

  // 请求方签名（可选，用于 dApp 身份验证）
  // 签名内容：SHA256(version + category + purpose + requester_address + expires_in_blocks)
  requester_signature?: string;
}
```

### 3.3 PIICategory 枚举

```typescript
enum PIICategory {
  EMAIL   = 1,   // 邮箱地址
  PHONE   = 2,   // 电话号码
  ADDRESS = 3,   // 邮寄/住宅地址
  NAME    = 4,   // 姓名
  CUSTOM  = 99,  // 自定义（需配合 custom_schema_hash 字段）
}
```

> **⚠️ DISCREPANCY — pending v2 reconciliation (flagged 2026-05-29)**
> The category IDs above DO NOT match the deployed contract or `02-data-model.md`.
> The **authoritative IDs** (as implemented in `leo_program/aleo_pii_protocol_v1/src/main.leo`
> and `docs/02-data-model.md`) are:
> `ADDRESS=0, PHONE=1, EMAIL=2, CUSTOM=3, KYC=4`.
> This document's enum was written before the contract was finalized and has not been
> updated. Do NOT rely on the values in the `PIICategory` enum above for any implementation.
> This discrepancy is tracked for reconciliation in the contract v2 scoping phase.

### 3.4 PIIPurpose 枚举

```typescript
enum PIIPurpose {
  ORDER_DELIVERY      = 1u128,   // 订单配送
  ACCOUNT_VERIFICATION = 2u128,  // 账户实名验证
  BILLING             = 3u128,   // 账单/支付
  COMMUNICATION       = 4u128,   // 通讯联络
  LEGAL_COMPLIANCE    = 5u128,   // 法律合规要求
  CUSTOM              = 99u128,  // 自定义（需配合 custom_purpose_text 字段）
}
```

### 3.5 请求发起方式

在浏览器扩展生态中，RequesterDApp 通过以下方式向 Leo Wallet 发起请求：

```typescript
// RequesterDApp 侧
const request: PIIShareRequest = {
  version: "1.0",
  category: PIICategory.ADDRESS,
  purpose: PIIPurpose.ORDER_DELIVERY,
  requester_address: "aleo1<requester_program_address>",
  expires_in_blocks: 100,
  display_name: "XX DAO",
  display_purpose: "地址确认",
  privacy_policy_url: "https://example.com/privacy",
};

// 通过 window.postMessage 或 custom event 发送到钱包扩展
// 具体通信机制待 Leo Wallet 官方标准化 — 待Phase 1验证
window.dispatchEvent(new CustomEvent("aleo-pii-share-request", {
  detail: request
}));
```

**注意**：浏览器扩展间的消息通信机制（`window.postMessage` vs `chrome.runtime.sendMessage`）的具体实现，取决于 Leo Wallet 是否暴露对应接口。当前阶段建议在同域 dApp 内通过 wallet adapter 的 `requestTransaction` 直接触发，跨域场景留待 Phase 1 验证。

---

## 4. 标准响应格式

### 4.1 成功响应

```typescript
interface PIIShareResponse {
  status: "success";

  // 链上 transaction ID
  transaction_id: string;

  // 产生的 SharedPIIRecord 的 commitment（record identifier）
  shared_record_commitment: string;

  // 共享有效期截止块高
  expires_at_block: number;

  // 数据摘要（SHA256 of plaintext payload，供接收方验证完整性）
  payload_hash: string;
}
```

### 4.2 错误响应

```typescript
interface PIIShareError {
  status: "error";

  code: PIIShareErrorCode;

  // 人类可读错误信息
  message: string;
}

enum PIIShareErrorCode {
  USER_REJECTED         = 1001,  // 用户拒绝授权
  WALLET_NOT_CONNECTED  = 1002,  // 钱包未连接
  RECORD_NOT_FOUND      = 1003,  // 找不到目标 category 的 PIIRecord
  NETWORK_MISMATCH      = 1004,  // 网络不一致（用户在 mainnet，dApp 在 testnet）
  INVALID_REQUESTER     = 1005,  // requester_address 格式非法
  EXPIRED_REQUEST       = 1006,  // 请求本身已超时（建议请求有效期 30s）
  TRANSITION_FAILED     = 1007,  // 链上 transition 执行失败
  INSUFFICIENT_CREDITS  = 1008,  // 手续费不足
}
```

---

## 5. 第三方 dApp 接入 Checklist

### 5.1 准备工作

- [ ] **获取 Aleo address 作为 recipient**：requester dApp 必须有一个专用的 Aleo address 用于接收 `SharedPIIRecord`。该 address 的 view key MUST 由 dApp 后端安全持有（不得暴露给前端或日志）。
- [ ] **部署或声明 program**：dApp MUST 部署或指向一个包含 `consume_shared` transition 的 program，以确保 record 可被正确销毁。
- [ ] **声明接受的 PII categories**：在 dApp 注册信息中明确列出需要的 category，仅请求必要字段（最小披露原则）。
- [ ] **准备 display_name 和 privacy_policy_url**：这两项将在用户授权弹窗中展示，MUST 准确。

### 5.2 集成步骤

**Step 1：构建 ShareRequest**

```typescript
import { PIIShareRequest, PIICategory, PIIPurpose } from "@aleo-pii-protocol/sdk";

const request: PIIShareRequest = {
  version: "1.0",
  category: PIICategory.ADDRESS,
  purpose: PIIPurpose.ORDER_DELIVERY,
  requester_address: DAPP_ALEO_ADDRESS,
  expires_in_blocks: 100,
  display_name: "XX DAO",
  display_purpose: "确认地址",
};
```

**Step 2：调用 share_pii transition**

```typescript
// 通过 Leo Wallet adapter 发起
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

const { requestTransaction } = useWallet();

const aleoTransaction = {
  program: "pii_protocol_v1.aleo",
  functionName: "share_pii",
  inputs: [
    sourceRecord,                          // 用户的 PIIRecord（ciphertext 或 plaintext）
    request.requester_address,             // receiver address
    (currentBlock + request.expires_in_blocks).toString() + "u64",
    request.purpose.toString() + "u128",
    generateNonce(),                       // new_nonce: field（ChaCha::rand_field() 等效）
    currentBlock.toString() + "u64",       // shared_at: current block height
  ],
  fee: 0.01,  // 建议最低费用，实际按网络情况调整
};

const result = await requestTransaction(aleoTransaction);
```

**Step 3：扫描并解密 SharedPIIRecord**

```typescript
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

const { requestRecordPlaintexts } = useWallet();

// requester dApp 用自己的钱包连接扫描
const records = await requestRecordPlaintexts("pii_protocol_v1.aleo");

// 过滤出 SharedPIIRecord 类型，且 owner == DAPP_ALEO_ADDRESS
const sharedRecords = records.filter(r =>
  r.recordName === "SharedPIIRecord" && !r.spent
);
```

**Step 4：解码 payload**

```typescript
import { decodePIIPayload } from "@aleo-pii-protocol/sdk";

for (const record of sharedRecords) {
  const payload = decodePIIPayload(record.data.payload);
  // 在内存中处理 payload，不持久化明文（见 7.1）
  await processDeliveryAddress(payload);

  // Step 5：强制 consume
  await consumeShared(record);
}
```

**Step 5：调用 consume_shared 销毁 record**

```typescript
async function consumeShared(sharedRecord: AleoRecord) {
  const tx = {
    program: "pii_protocol_v1.aleo",
    functionName: "consume_shared",
    inputs: [sharedRecord],
    fee: 0.005,
  };
  await requestTransaction(tx);
}
```

### 5.3 必须遵守的规范

**MUST 遵守**：

1. **最小披露**：仅请求业务所必需的 PII category，MUST NOT 请求不需要的字段。
2. **即用即销毁**：`consume_shared` MUST 在成功读取 payload 后立即调用，不得缓存 record 以备后用。
3. **不可重新加密分发**：接收方 MUST NOT 将解密后的 PII 明文加密后再发送给第三方（即不允许将范式 A 的结果作为另一次范式 A 的源头）。dApp 不得成为 PII 的转发中间商。
4. **明文不持久化**：除非经过独立加密存储（如 AES-256-GCM with KMS），MUST NOT 将解密后的 PII 明文写入数据库、日志或缓存。
5. **超时处理**：若 `requestRecordPlaintexts` 超时（建议超时阈值 30s），MUST 向用户展示重试提示，不得假设 record 不存在。

**SHOULD 遵守**：

6. 为用户提供已共享 PII 的查看和撤销入口（通过 revocation mapping）。
7. 在 dApp 界面显示"数据已销毁"确认（consume tx 完成后）。

---

## 6. 互通中的 UX 规范

### 6.1 用户授权弹窗必须显示的信息

Leo Wallet 在弹出授权确认弹窗时，MUST 显示以下所有信息（不得省略）：

| 字段 | 来源 | 展示格式 |
|------|------|--------|
| 请求方名称 | `display_name` | 大号字体，主标题位置 |
| 请求的数据类型 | `category` 翻译 | 如"家庭地址"、"手机号码" |
| 用途说明 | `display_purpose` | 副标题或说明文字 |
| 有效期 | `expires_in_blocks` 转换为人类时间 | 如"约 10 分钟（100 个区块）" |
| 隐私政策链接 | `privacy_policy_url` | 可点击链接 |
| 操作按钮 | — | "允许"和"拒绝"，拒绝为默认焦点 |

**弹窗示例文案**：

```
XX外卖 请求访问您的以下信息：
  📦 家庭地址
用途：地址确认
有效期：约 10 分钟（100 个区块后自动失效）

[查看隐私政策]         [拒绝]  [允许]
```

### 6.2 取消授权

协议提供撤销机制（软撤销，基于 revocation mapping）：

1. **用户侧**：在钱包或 PII 管理 dApp 中，用户可调用 `mark_revoked(original_nonce)` transition，将原始 `PIIRecord.nonce` 写入链上 `revoked_nonces` mapping。`mark_revoked` 以 `PIIRecord.nonce` 为 key 写入 `revoked_nonces` mapping；接收方 dApp 在 `consume_shared` 前查询此 mapping。
2. **接收方侧**：dApp 在 `consume_shared` 前，SHOULD 查询 `revoked_nonces` mapping 以确认 record 未被撤销。已撤销 record 的 `consume_shared` 调用 MUST 失败。
3. **自动到期**：`expires_at` 过期后，`consume_shared` 自动失败，等同于被撤销。

---

## 7. 安全规范

### 7.1 dApp 禁止持久化解密后的明文

**规范**：接收方 dApp 在调用 `requestRecordPlaintexts` 或 `decrypt` 后获得的 PII 明文，MUST NOT 以任何形式写入：
- 关系数据库（plaintext 列）
- 对象存储（未加密）
- 应用日志
- 前端 `localStorage` / `sessionStorage`（除非二次加密）
- 浏览器控制台输出

**允许的持久化方式**：对明文二次加密（建议 AES-256-GCM，key 由 KMS 管理，key 与数据分离存储）。

**强烈建议**：明文仅在内存中存活至业务逻辑完成，随后立即 consume_shared 并清除内存引用。

### 7.2 解密后的明文使用窗口

推荐的安全窗口：

```
[record 解密] → [立即处理业务逻辑] → [consume_shared] → [清除内存引用]
         ↑                                       ↑
         最大 5 分钟窗口                    强制执行点
```

- 从 `requestRecordPlaintexts` 返回到 `consume_shared` 完成，SHOULD 不超过 **5 分钟**。
- 若因链上拥堵 `consume_shared` 无法及时完成，SHOULD 将明文从内存清除，等 consume 确认后记录为"数据已处理"状态。

### 7.3 view key 安全

接收方 dApp 的 Aleo address 对应的 view key MUST：
- 仅存储在服务端安全环境（HSM / KMS / 加密的环境变量）
- MUST NOT 出现在前端代码、源码仓库、日志中
- 建议使用专用地址（与运营资金地址分离）

---

## 8. 反模式

以下模式在 Aleo PII Protocol 中明确禁止：

### 8.1 不要把整个 PIIRecord 转发给后端

**反模式**：
```typescript
// ❌ 错误做法
const records = await requestRecordPlaintexts("pii_protocol_v1.aleo");
await fetch("/api/store-pii", {
  method: "POST",
  body: JSON.stringify(records),  // 把整条 record（含 owner、nonce、所有字段）发给后端
});
```

**原因**：这将用户完整的链上身份（owner address、nonce、所有 PII）暴露给 dApp 后端，等同于把 view key 效力的数据全量托管给第三方，违反最小披露原则，且用户不可感知。

**正确做法**：仅提取业务需要的字段（如 `payload.address_line_1`），仅在内存中使用，不转发整条 record。

### 8.2 不要批量预取所有共享 record

**反模式**：
```typescript
// ❌ 错误做法
// dApp 后台定时批量扫描所有 SharedPIIRecord 并缓存
const allShared = await requestRecordPlaintexts("pii_protocol_v1.aleo");
await cache.set("all_shared_pii", allShared, { ttl: 3600 });
```

**原因**：批量预取并缓存意味着 PII 在"还没被使用"时就已经被读取和存储，使"即用即销毁"语义完全失效。

**正确做法**：只在实际业务触发时（如用户下单）扫描并读取对应 record，读取后立即 consume。

### 8.3 不要把用户 view key 交给 dApp

**反模式**：
```typescript
// ❌ 错误做法
// dApp 请求用户直接提供 view key
const viewKey = prompt("请输入您的 Aleo view key 以加速 PII 读取");
```

**原因**：view key 可解密该地址下所有历史 record（包括未来 record），一旦泄露等同于永久暴露所有链上私密数据。

**正确做法**：所有解密操作通过 Leo Wallet adapter 的 `requestRecordPlaintexts` / `decrypt` 接口完成，钱包在本地处理 view key，dApp 不触碰 view key。

### 8.4 不要忽略 expires_at 检查

**反模式**：
```typescript
// ❌ 错误做法
// 不检查有效期，直接尝试使用可能已过期的 record
const payload = decodeRecord(anySharedRecord);
await processPayload(payload);
```

**原因**：过期 record 的 `consume_shared` 会失败（链上强制），但 dApp 如果不做客户端过期检查，可能在链上失败前就将明文用于业务，且消耗手续费。

**正确做法**：使用前检查 `record.data.expires_at < currentBlockHeight`，过期则通知用户重新授权。

---

## 9. 未来扩展占位

### 9.1 范式 C — ZK 选择性披露

范式 C 指用户不共享 PII 明文，而是生成一个 ZK proof，证明"我的 PII 满足某条件"（如"我的年龄 > 18"），而不暴露具体值。

**当前状态**：Leo 4.0 引入了 `snark.verify` 链上 SNARK 验证能力，范式 C 在技术上已具备基础条件。

**升级路径**（范式 A → 范式 C）：

1. 定义 `PIIProofRequest` schema，包含 `predicate`（断言条件）和 `circuit_id`（验证电路标识）
2. 为每类 PII 断言（年龄、地区、邮编）部署对应的 verifier program
3. 接入方调用 `verify_pii_predicate(proof, public_inputs)` 替代 `consume_shared`
4. 范式 A 的 PII record 可作为范式 C proof 的私有输入（无需 API 变更，只扩展新 transition）

**对现有接入方的影响**：范式 A 接入方无需修改现有集成，范式 C 作为可选升级路径提供。

### 9.2 多 recipient 批量授权

当用户希望同时授权多个 dApp（如物流 + 外卖 + 电商）访问同一 PII 时：

**现有机制**：使用 `requestBulkTransactions` 一次提交多笔 `share_pii` transaction，用户单次确认。（注：`requestBulkTransactions` 生产可用度待 Phase 1 验证）

**未来扩展**：定义 `multi_share_pii(source, recipients: [address; N], ...)` transition，单 tx 产出多条 `SharedPIIRecord`，受 `MAX_ARRAY_ELEMENTS`（当前 2048）限制，理论上单次最多 2048 个 recipient。

**优先级**：Phase 2（P1 为单 recipient 验证，P2 为批量）。

---

*文档版本：draft | 最后更新：2026-05-26*
*相关文档：[[05-wallet-integration]] | [[06-acceptance-criteria]]*
