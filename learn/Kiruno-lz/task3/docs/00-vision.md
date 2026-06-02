---
doc: 00-vision
phase: 4
status: in-progress
last_review: 2026-05-29
---

# Aleo PII Protocol — 项目愿景

## 项目愿景

Aleo PII Protocol 是部署在 Aleo testnet 上的**通用个人身份信息（PII）存储与互通协议**，定位为基础设施层而非终端应用。协议将地址、电话、邮箱等敏感数据以加密 record 形式存储在 Aleo 链上，以"用户授权再加密"（范式 A）为唯一互通范式——用户用自己的 view key 解密原 record、以接收方地址为 `owner` 字段输出新 record，Aleo 协议层自动完成公钥加密——从而在不暴露明文的前提下实现跨 dApp 的 PII 可控共享。协议的终极目标是成为 Aleo 生态中 PII 数据的事实标准存储层，使任何 dApp 只需调用协议 transition 即可获得合规的、用户主权的个人数据访问能力。

---

## 核心价值主张

1. **用户完全主权**：PII 以 private record 形式存储，链上仅有密文，任何第三方（包括本协议的部署者）均无法在未获授权的情况下读取明文。[^1]
2. **零集成摩擦的共享原语**：dApp 无需自建加密体系，只需调用 `share_pii` transition；Aleo 协议层自动完成基于接收方公钥的加密，开发者从不接触原始密钥材料。[^2]
3. **可撤销授权，非永久绑定**：通过消费（consume）原 record 并写入 revocation mapping 的方式实现撤销语义，防止"授权即永久"的合规陷阱。
4. **通用 PII schema，跨 dApp 一致**：地址、电话、邮箱及自定义字段均以固定长度 `[u128; N]` 编码，消除不同 dApp 间的 schema 漂移，降低接入成本。
5. **成本可控，可部署验证**：program 名 `pii_protocol_v1.aleo`（12 字符）免 namespace 费；中等复杂度部署约 2–10 credits，单次 transition 执行约 3–10 millicredits，公开 faucet 可支撑完整 MVP 测试周期。[^3]

---

## 目标用户

### 协议层用户（dApp 开发者）
- NFT项目实物空投（潮玩/T-shirt/书）
- Web3电商
- DAO贡献者奖励发货
- 加密原生订阅盒（类似Bitwarden但是地址簿）

他们通过调用本协议的 transition 获得经用户授权的 PII record，无需处理密钥管理。

### 终端用户（持有 PII 的 Aleo 用户）
在 Aleo 上持有钱包的个人用户，希望一次录入个人信息后按需授权给多个 dApp，并随时能撤销某个 dApp 的访问权限，同时保持信息不被任何中心化平台持久留存。

---

## In-Scope（MVP 范围内）

- **PII 字段类型**：地址（street/city/postal）、电话号码、邮箱地址、自定义 PII 条目（由 `category: u8` 字段区分类型）
- **CRUD 操作**：创建新 PII record（create）、读取自有 record（read，经 view key 解密）、更新（consume 旧 record + 创建新 record）、销毁（consume record 不产出新 record）
- **范式 A 共享**：用户解密自己的 record，以接收方地址为 owner 输出新 record，协议层自动加密
- **撤销机制**：通过消费已共享 record 的 nonce 或向 revocation mapping 写入标记，使接收方持有的 record 在业务层失效
- **Leo Wallet 集成**：使用 `@demox-labs/aleo-wallet-adapter-leo` 进行连接、解密（`decrypt` / `requestRecordPlaintexts`）和 transition 提交
- **示例外卖 dApp**：一个最小可验证的集成示例，完整跑通创建 → 共享 → 接收方解密 → 撤销闭环

---

## Out-of-Scope（明确不做）

- **KYC / 身份验证**：本协议存储 PII 但不验证其真实性，身份证明由 zPass 等专项协议负责。见 [[07-non-goals]]
- **社交关系图谱**：不构建用户间的社交关系或信任网络
- **文件存储**：不支持图片、PDF 或任何二进制大文件；仅限结构化短文本 PII
- **账户恢复**：私钥丢失后的恢复机制属于钱包职责，协议层不介入
- **链下物流/订单管理系统**：物流调度、订单状态跟踪等应用层业务不在本协议范围内
- **主网部署**：MVP 仅在 testnet（`api.explorer.provable.com/v1/testnet`，Chain ID=1）验证
- **多链桥接**：本协议不提供跨链互操作能力

完整不做清单见 [[07-non-goals]]。

---

## MVP 成功指标

以下指标均须在 testnet 上完成端到端验证，缺一不可：

| 编号 | 指标 | 可量化标准 |
|------|------|-----------|
| M1 | 协议部署成功 | `pii_protocol_v1.aleo` 成功部署到 testnet，transaction 状态为 `Accepted`，区块确认数 ≥ 1 |
| M2 | 创建 PII record | 用户 A 通过 Leo Wallet 授权 `create_pii` transition，自有 record 可通过 `requestRecordPlaintexts` 查到，解密后字段与输入一致 |
| M3 | 共享 PII record | 用户 A 调用 `share_pii` transition，用户 B（不同地址）的钱包可通过 `requestRecordPlaintexts` 查到对应 record 并解密出正确明文 |
| M4 | 撤销共享 | 用户 A 调用撤销 transition 后，revocation mapping 中该 nonce 标记为已撤销；示例 dApp 查询后拒绝使用该 record |
| M5 | 示例外卖 dApp 完整闭环 | 1 个示例 dApp 跑通：录入地址 → 共享地址 → 第三方地址解密获得明文地址 → 用户撤销授权 → dApp 确认 record 失效；全程 ≤ 4 笔 transaction，总 credits 消耗 ≤ 50 |
| M6 | 文档与可复现性 | 任意新开发者按 README 操作，在全新环境中 30 分钟内完成上述 M1–M4 全部流程 |

---

## 长期愿景

Aleo PII Protocol 的长期定位是成为 **Aleo 生态的 PII 数据事实标准层**，类似以太坊生态中 ENS 之于地址解析的角色——不是终端应用，而是每个需要处理用户个人信息的 dApp 都可以依赖的基础协议。

具体愿景路径：
- **Phase 1（MVP）**：testnet 验证，跑通范式 A 完整闭环，产出可复用的 Leo 合约模块和前端 adapter
- **Phase 2**：引入选择性披露 ZK 证明（范式 C），用户无需转让明文即可向接收方证明"我的地址在北京"；支持 Shield Wallet / Puzzle Wallet 等更多钱包
- **Phase 3**：schema 版本升级机制落地，协议治理框架提案；考虑 mainnet 部署
- **长期**：成为 Aleo ARC 标准提案（类似 ERC-20 对 token 的意义），推动生态内 PII 互通标准化

---

[^1]: record 的 `owner` 字段默认 `private`，链上无法从 record 直接看出 owner 是谁；private 字段由 Aleo 协议用 Diffie-Hellman 派生 shared key 加密。见 `_research/aleo-status-2026-05.md#26-private-vs-public-语义`
[^2]: 范式 A 可行性已确认，`transfer_private` 即为最小实现；开发者只需将 receiver address 写入 `owner` 字段，协议自动完成加密。见 `_research/aleo-status-2026-05.md#7-范式-a-可行性用户授权再加密`
[^3]: 部署成本数据来自官方文档样例与 Aleo Stack v4.2.0 的 base fee 降低 90% 说明。见 `_research/aleo-status-2026-05.md#4-部署与执行成本`
