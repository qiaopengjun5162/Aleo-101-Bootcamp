---
doc: 07-non-goals
phase: 4
status: stable
last_review: 2026-05-29
---

# Aleo PII Protocol — Non-Goals（Scope Creep 防火墙）

> 本文档是**硬性边界声明**，不是功能讨论区。任何"这个功能看起来很合理"的新需求，在被加入 scope 之前必须先从本文档的清单中删除对应条目，并经过显式决策记录。与愿景对应见 [[00-vision]]；威胁分析见 [[01-threat-model]]。

---

## 1. 明确不做的事项

### 1.1 账户恢复

**不做**：私钥丢失后的助记词找回、社交恢复、多签恢复、任何形式的密钥备份托管。

**理由**：账户恢复是钱包（Leo Wallet）的职责边界。本协议的信任模型建立在"用户独立持有私钥"的假设上；如果协议层介入密钥托管，会引入新的信任关系并成为安全单点——攻击者只需攻破协议的恢复机制即可获取所有用户 PII。这是越界行为，不是功能扩展。任何账户恢复需求应引导用户到 Leo Wallet 的官方支持渠道。

---

### 1.2 链下物流/订单管理系统

**不做**：物流状态跟踪、快递单号记录、订单生命周期管理、货到付款结算、配送轨迹上链。

**理由**：本协议是数据访问层，不是业务逻辑层。物流/订单管理是示例外卖 dApp 的应用层职责，由调用本协议的 dApp 开发者实现。协议只回答"这个地址的用户授权了哪个配送地址给我"，不回答"这个订单现在在哪里"。混入订单逻辑会使协议变成垂直应用，失去通用性。

---

### 1.3 PII 明文的链下备份/导出

**不做**：把 PII 明文导出到 IPFS、Arweave、S3 或任何链下存储；提供"一键导出我的数据"到明文 JSON/CSV 的功能；提供明文备份二维码。

**理由**：这直接违背协议的核心价值主张。协议存在的意义是让 PII 以加密形式存储在 Aleo 链上，用户只在需要时通过钱包解密。一旦提供链下明文导出，等于主动将加密系统降级为"数据库加个密码"——攻击面从零知识证明层扩展到任意链下存储系统。如果用户需要备份 PII，正确路径是备份 Leo Wallet 助记词（钱包责任，见 1.1）。

---

### 1.4 身份验证/KYC

**不做**：验证用户提交的 PII 是否真实（如手机号短信验证、地址邮政验证、政府 ID 核验）；颁发身份凭证；与 KYC 服务商集成。

**理由**：本协议存储 PII，但对其真实性不做任何断言。混入 KYC 会让协议承担"权威真实性认证者"的角色，这与 zPass 等专项凭证协议重叠。KYC 要求持有用户明文并与外部权威核验，这与本协议"最小披露、链上加密"的设计哲学根本冲突。需要 KYC 的场景应在本协议上层由专项服务处理，本协议只提供"用户声称自己有这些信息"的存储原语。

---

### 1.5 支付/结算

**不做**：在协议层嵌入支付逻辑、代付手续费（fee delegation for users）、PII 数据市场、数据出售结算。

**理由**：支付是独立的 scope，应使用 Aleo credits 或专项 token 标准（ARC-20）单独实现。在 PII 协议中嵌入支付逻辑会：（1）大幅增加合约攻击面；（2）引入经济激励可能使协议变成数据买卖市场，违背用户主权初衷；（3）使协议审计复杂度翻倍。

---

### 1.6 多链桥接

**不做**：将 Aleo PII 协议的 record 桥接到以太坊、Solana 或其他链；跨链身份聚合；在其他链上重新发行 PII 凭证。

**理由**：MVP 仅在 Aleo testnet 验证。多链桥接涉及跨链消息协议、异构加密体系、额外的信任假设（桥接合约）和大量安全审计工作。这些与当前阶段的核心目标（验证范式 A 在 Aleo 上的可行性）完全正交。任何"顺便支持以太坊"的想法都应归入 Phase 3+ 的技术调研任务。

---

### 1.7 自建 indexer

**不做**：在 MVP 阶段运维完整 snarkOS 节点；建设专属数据库缓存 record ciphertext；维护私有 block explorer。

**理由**：自建 indexer 是运维负担，不是产品功能。MVP 阶段使用 Leo Wallet 的 `requestRecordPlaintexts` API 直接扫描（wallets can do the scanning），或使用 `aleo-record-scanner` npm 包在客户端完成 view key 试解密。[^1] 这已足够验证核心闭环。自建 indexer 应在 Phase 2（如果 wallet scan 性能不满足需求后）再评估引入。

---

### 1.8 主网部署

**不做**：在 Aleo mainnet（Chain ID=0）部署 `pii_protocol_v1.aleo`；向真实用户开放主网版本；承诺主网的 SLA 或数据持久性。

**理由**：协议存在未经充分验证的设计假设（schema 版本升级路径、revocation 机制正确性、gas 成本估算准确性）。在 testnet 验证通过、完成安全审计、确定 upgrade constructor 设计之前，主网部署属于不负责任的行为。mainnet 部署的入场门槛是：testnet 闭环 + 形式化验证或 audit report + 社区公示。

---

### 1.9 手机/桌面端原生应用

**不做**：iOS/Android 原生 app；Electron 桌面客户端；React Native 移动端；PWA 推送通知。

**理由**：Web 优先（Vite + React + Leo Wallet 浏览器扩展）是本阶段的技术栈决策。[^2] 原生应用需要单独的钱包 SDK 集成方案（Leo Wallet 目前主要以浏览器扩展形式提供），会引入 App Store 审核流程和额外的平台安全考量。MVP 阶段无此需求，也无此资源。

---

## 2. "听起来合理但不做"的诱惑清单

以下是最常被提出、表面合理但实质上会导致 scope creep 的功能请求。遇到这些提议时，直接引用本节拒绝，无需重新论证：

| 诱惑 | 看起来合理的理由 | 实际问题 |
|------|----------------|---------|
| "加一个 ENS 风格的用户名解析，让用户用 `alice.pii.aleo` 代替地址" | 友好易用，降低地址管理负担 | ANS（Aleo Name Service）已存在且定位不同；重复造轮子，且会把命名层和数据层耦合 |
| "让用户可以给 PII record 设置访问密码（pin code）" | 双重保护感觉更安全 | pin code 存在哪？存链上 = 明文；存链下 = 新的密钥管理问题；总体上安全模型变复杂而非变强 |
| "支持用户互相评价（reputation score）" | 外卖/电商场景需要信任分 | 这是社交关系图谱，明确 out-of-scope（见 [[00-vision]] Out-of-scope）；且把 PII 协议变成社交平台 |
| "加一个通知系统，当有人请求我的 PII 时发邮件" | 用户体验好 | 需要链下服务器维持 email 推送，引入中心化基础设施，违背"无需信任第三方"的协议哲学 |
| "做一个 PII 数据质量评分，告诉 dApp 这个地址的邮箱/地址是否经过验证" | dApp 需要知道 PII 是否真实 | 这是 KYC，明确 out-of-scope（见 1.4）；且会让本协议承担数据真实性背书责任 |
| "加多签授权，需要两个钱包同时签名才能共享 PII" | 防止单点控制 | 大幅增加 UX 复杂度；Leo Wallet 目前无内置多签支持；MVP 阶段无此安全需求 |
| "提供一个官方 relay 服务，帮 gas 不足的用户代付手续费" | 降低新用户门槛 | 这是支付/代付，明确 out-of-scope（见 1.5）；且让协议运营者成为信任中心 |
| "在协议里记录每次 PII 访问的审计日志" | 合规需求，知道谁看了我的数据 | 审计日志若存链上 = 公开（隐私问题）；若存链下 = 新基础设施；范式 A 的 ZK 特性本身已提供一定程度的访问隐私 |

---

## 3. 跨 Phase 扩展占位

**以下功能确认会做，但不在 MVP（Phase 1）范围内**。提前在此声明，防止被催熟进入当前迭代：

### Phase 2（testnet 稳定后）

| 功能 | 背景 | 阻塞条件 |
|------|------|---------|
| **选择性披露 ZK 证明（范式 C）** | 用户无需转让 PII 明文，向接收方证明"我的地址在北京市"或"我的手机号已验证"；使用 `snark.verify`（Leo 4.0 新增）[^3] | 需要研究 Aleo 上 recursive proof / attribute proof 的具体实现路径；MVP 先跑通范式 A |
| **批量共享（Bulk Share）** | 一次 transition 将同一份 PII 共享给多个 receiver；减少用户点击次数 | 需评估单 transition 输出 record 上限与 `requestBulkTransactions` 的实际可用性 [^4] |
| **多钱包支持** | 除 Leo Wallet 外，支持 Shield Wallet、Puzzle Wallet、FoxWallet | 需各钱包适配器稳定；Leo Wallet 验证通过后逐步扩展 |

### Phase 3（mainnet 前）

| 功能 | 背景 | 阻塞条件 |
|------|------|---------|
| **schema 版本升级机制** | 当 PII 字段定义需要扩展时（如新增护照字段），如何迁移旧 record 到新 schema 而不破坏已有集成 | 需要在初次部署时声明 constructor block（见 `_research/aleo-status-2026-05.md#81-文档工具链-known-gaps`）；Phase 1 已为此预留，但迁移逻辑本身是 Phase 3 工作 |
| **mainnet 部署** | 见 1.8；在完成 audit 和 testnet 充分验证后考虑 | 安全审计完成 + 社区公示 + schema 冻结 |
| **链上访问控制 ACL** | 允许用户设置"仅白名单 program 可接收我的 PII"，在协议层拒绝未授权 dApp 的共享请求 | 需要 mapping-based ACL 设计，当前优先级低于核心 CRUD + 范式 A |

---

[^1]: records 无 owner 索引，必须通过 view key 试解密；`requestRecordPlaintexts` 和 `aleo-record-scanner` 是 MVP 阶段的推荐方案。见 `_research/aleo-status-2026-05.md#52-按-owner-查-records-是否可行`
[^2]: 技术栈决策：Aleo testnet + Leo 4.x + Leo Wallet + Vite + bun。见项目定义说明。
[^3]: Leo 4.0 新增 `snark.verify` 支持链上 SNARK 验证，为范式 C 提供技术基础。见 `_research/aleo-status-2026-05.md#14-snarkos--snarkvm-版本`
[^4]: `requestBulkTransactions` 存在但实际可用性待验证；单 transition 输出 record 数量有上限。见 `_research/aleo-status-2026-05.md#35-批量交易--batch-signing` 和 `_research/aleo-status-2026-05.md#74-范式-a-在-pii-协议中的额外要求`
