---
doc: 01-threat-model
phase: 4
status: in-progress
last_review: 2026-05-29
---

# Aleo PII Protocol — 威胁模型

> 本文档基于 STRIDE 框架本土化改写，所有 Aleo 协议层事实均来自调研报告。与愿景对应见 [[00-vision]]，与边界划定对应见 [[07-non-goals]]。

---

## 1. 资产清单

| 资产 | 敏感度 | 描述 | 若泄露的后果 |
|------|--------|------|-------------|
| **PII 明文** | 最高 | 用户的地址、电话、邮箱等原始文本，存在于用户客户端解密后的内存中 | 直接暴露真实身份，导致物理追踪、骚扰、欺诈 |
| **用户私钥 / view key** | 最高 | Leo Wallet 管理的 spending key 和 view key；spending key 可签名任意 transition，view key 可解密所有该地址的 private record | 私钥泄露 = 账户完全失控；view key 泄露 = 历史全部 PII 一次性曝光 |
| **接收方公钥（address）** | 中 | 接收方的 Aleo 地址，在 `share_pii` transition 中作为 `owner` 参数传入 | 单独泄露危害有限（address 是公开信息），但与 PII 明文关联后可建立身份图谱 |
| **revocation mapping 状态** | 中 | 链上公开的撤销标记映射（nonce → revoked bool） | mapping 本身公开无密，但若被篡改可导致已撤销 record 被误信为有效 |
| **链上 record 密文** | 低 | 以 ciphertext 形式存储的 record 快照，无 view key 无法解读内容 | 单独泄露危害极低；但可与外部数据联合分析做链上关联（traffic analysis） |
| **dApp 的接入凭证** | 低 | dApp 与协议交互时的 programId 和 function 名，均为公开链上信息 | 无直接隐私危害，但暴露 dApp 接入情况 |

---

## 2. 攻击者画像

### 2.1 链上观察者（被动网络监听）

**动机**：通过分析链上公开数据推断用户行为，构建身份关联图谱。

**能力**：
- 可访问所有公开 block 数据、transaction 记录、mapping 状态
- 可获取所有 record ciphertext（但无法解密）
- 可观察 transition 的输入/输出结构（record 数量、类型标签等元数据）
- 可通过 `api.explorer.provable.com/v1/testnet` REST API 自动化抓取

**无法做到**：读取 private record 字段明文；推断 record 的实际 owner（owner 字段加密）。[^1]

**典型攻击**：
- 统计某地址发出/接收 `share_pii` transition 的频率，推断其社交关系图
- 对比 transition 时间戳与外部事件关联，推断用户行为模式

**威胁级别**：协议层元数据泄露，属于流量分析（traffic analysis），本协议无法完全消除。

---

### 2.2 恶意 dApp（请求过量 PII、未授权使用）

**动机**：获取超出自身业务需要的 PII，或在用户不知情时转售/滥用授权数据。

**能力**：
- 可构造欺骗性 UI 诱导用户点击 Leo Wallet 授权弹窗
- 可在用户授权后把收到的 PII record 明文转发给第三方
- 可伪装成可信 dApp，通过钓鱼诱导用户执行 `share_pii` transition

**无法做到**：绕过 Leo Wallet 的用户授权弹窗；在未经用户授权的情况下触发 transition。[^2]

**典型攻击**：
- 请求用户授权共享全部 PII 字段（地址+电话+邮箱），但实际业务只需要配送地址
- 伪造紧急场景（"验证身份，否则订单取消"）迫使用户在不仔细阅读弹窗的情况下确认

**威胁级别**：高。技术层面协议无法限制接收方获得明文后的链下行为。

---

### 2.3 钱包被盗（spending key / view key 泄露）

**动机**：转移资产，或批量解密用户历史 PII 记录。

**能力**：
- 持有 spending key：可签名任意 transition，包括把用户全部 PII record 共享给攻击者控制的地址
- 持有 view key：可解密该地址历史上所有 private record，一次性获取全部 PII 明文

**无法做到**：在不持有对应密钥的情况下解密 record；伪造 ZK 证明（snarkVM 层保障）。[^3]

**典型攻击**：
- 恶意浏览器插件读取 Leo Wallet 本地 keystore
- 用户在钓鱼页面输入助记词
- 中间人攻击拦截钱包 API 响应

**威胁级别**：最高。一旦私钥泄露，所有存储在该地址下的历史 PII 全部暴露，且不可逆。

---

### 2.4 接收方滥用（共享后转售/泄露）

**动机**：获取 PII 明文后将其出售或用于未授权目的（如精准广告、骚扰电话等）。

**能力**：
- 持有合法接收的 PII record，可用自己的 view key 解密获得明文
- 可将明文以任意链下方式传播（截图、数据库导出、转卖）
- 可再次调用 `share_pii`（如果协议不限制）将 record 转发给第三方

**无法做到**：
- 无法阻止用户主动撤销，但撤销不影响已经链下泄露的明文
- 无法伪造 PII 来源

**典型攻击**：
- 骑手类应用收集配送地址后批量出售给广告商
- 共享后的 record 在接收方 dApp 遭受数据库泄露

**威胁级别**：高。技术层面协议无法阻止已解密明文的链下传播，这是范式 A 的固有限制，属于残余风险（见第 6 节）。

---

## 3. 信任假设

协议设计建立在以下显式信任前提上，**任意一条失效都将导致协议安全性崩溃**：

| 信任假设 | 说明 | 失效后果 |
|---------|------|---------|
| **snarkVM 加密实现正确** | 依赖 snarkVM 的 Diffie-Hellman record 加密正确实现，无侧信道或数学漏洞 | 所有 record 密文可被破解，历史 PII 全部曝光 |
| **Leo Wallet 本地 keystore 安全** | 信任 Leo Wallet（`@demox-labs/aleo-wallet-adapter-leo`）的密钥存储不被恶意插件或操作系统层攻击者读取 [^4] | 私钥/view key 泄露，等同攻击者画像 2.3 |
| **用户对 Leo Wallet 授权弹窗的判断** | 用户在看到钱包授权弹窗时能够识别请求是否合理，不会在钓鱼场景下盲目确认 | 恶意 dApp 获得不应获得的 PII 共享授权 |
| **Aleo testnet 网络诚实性** | testnet 验证者节点不会串谋篡改 transition 输出或伪造 ZK 证明 | （testnet 阶段可接受，mainnet 前需重新评估） |

---

## 4. Aleo 协议层提供的保护

以下保护由 Aleo/snarkVM 层自动提供，本协议无需额外实现：

### 4.1 record owner 字段触发自动公钥加密

record 的所有 `private` 字段（默认修饰符）在 transition 输出时由 snarkVM 用 owner 的公钥派生加密密钥（Diffie-Hellman shared secret），以 ciphertext 形式写入链上。**链上观察者无法从 record 判断 owner 是谁**，也无法读取任何 private 字段内容。[^1]

### 4.2 view key 仅持有者可计算

view key 由用户私钥派生，数学上仅知道对应 spending key 的持有者可以生成。没有 view key，任何第三方（包括本协议合约代码）均无法解密 record 内容。这是范式 A 中"用户解密自己的 record"步骤的安全基石。

### 4.3 transition 的 ZK 证明保护输入隐私

`share_pii` transition 在链上发布 ZK 证明而非原始输入。`consumed` record（用户自己的 PII record）作为 private 输入传入 circuit，其内容不出现在链上任何公开字段中。链上只能看到"某地址消费了某 record commitment，产出了某两个新 record commitment"，无法从 proof 本身反推 PII 内容。[^5]

### 4.4 snarkOS v4.0.0 后接收方可识别发送方

snarkOS v4.0.0 升级后，record 中加密存储了 sender address，接收方可用自己的 view key 反解出是谁发送了该 record。[^6] 这使范式 A 中的授权可追溯，接收方知道 PII 来自哪个地址，防止匿名伪造共享。

---

## 5. 应用层需补充的保护

以下保护需本协议在应用层实现，Aleo 协议层不自动提供：

### 5.1 dApp 授权范围最小化（最小披露原则）

**设计要求**：`share_pii` transition 应支持按字段类型（`category: u8`）粒度授权，dApp 只能请求它实际需要的 PII 类型。实现方式：在 transition 参数中显式要求 dApp 声明 `requested_category: u8`，前端 UI 仅展示与该类型对应的 record 供用户选择共享。

**防止**：恶意 dApp 一次性获得用户全部 PII 字段（地址+电话+邮箱）而实际只需要其中一项。

### 5.2 共享 record 的一次性使用与有效期机制

**设计要求**：每个共享 record 携带 `nonce: field`（由 `ChaCha::rand_field()` 生成）。接收方 dApp 在使用 PII 时须向协议查询 `revoked_nonces[nonce]` 状态；一旦 nonce 被标记撤销，dApp 必须拒绝使用。

可选增强：在 record 中加入 `expires_at: u64`，transition 在 finalize 阶段对比 `block.height` 自动判断过期。

### 5.3 撤销机制（consume 原 record）

**设计要求**：用户可调用 `mark_revoked` transition（详见 [[03-program-interface]] §2.6），其语义为：向 `revoked_nonces` mapping 写入 `nonce → true`，使接收方在使用前能够链上验证该共享是否仍有效。

> 注：由于 UTXO 模型下 sender 无法 consume 接收方持有的 `SharedPIIRecord`，本协议采用 mapping 标记而非 record consume 实现撤销，原始 PII record 由用户自行 `update_pii` / `delete_pii` 管理。

**限制**：消费原 record 阻止了该 record 被再次使用，但**无法回收接收方已解密的明文**（这是残余风险，见第 6 节）。

### 5.4 钓鱼弹窗的 UX 防护

**设计要求**：前端集成规范应要求：
- 授权弹窗中显式展示本次共享的 PII 类型（`category` 字段人类可读描述）、接收方地址缩写
- 请求 `DecryptPermission.UponRequest`（每次单独询问），禁止使用 `AutoDecrypt`，确保每次共享需用户主动确认 [^7]
- 在前端显示"你正在授权共享：你的配送地址给：0xABC...DEF（外卖平台）"而非显示原始 transition 参数

---

## 6. 残余风险（显式承认）

以下风险在协议层**无法消除**，需在产品层面与用户沟通并接受：

### R1：接收方解密后链下泄露（最严重，无技术解）

**描述**：接收方（dApp 或个人用户）获得 PII record 后，可用自己的 view key 解密明文。一旦明文在接收方端存在，协议层没有任何机制阻止其被截图、导出、出售或在数据库泄露事故中曝光。

**接受理由**：这是范式 A 的固有属性。Aleo 协议层只能保证"传输过程加密"和"未授权方无法访问"，无法实现"接收后销毁"。选择性披露（范式 C）可在 Phase 2 缓解此问题，但 MVP 阶段不实现。

**缓解方向（非技术）**：在共享确认 UI 中明确告知用户"一旦共享，接收方可解密明文，撤销不能回收已解密的数据"。

### R2：testnet 阶段的网络不稳定性

**描述**：testnet 可能发生节点重启、链重置、RPC 端点不可用（`api.explorer.provable.com/v1/testnet`）等情况，导致 transaction 无法确认或 record 状态丢失。[^8]

**接受理由**：MVP 明确仅在 testnet 验证，不承诺 SLA；mainnet 部署前需重新评估。

### R3：Leo Wallet 私钥泄露

**描述**：如用户操作系统、浏览器或插件环境遭受攻击，Leo Wallet 本地 keystore 可能被读取，导致攻击者获得 spending key 和 view key，进而解密该地址历史全部 PII。[^4]

**接受理由**：密钥管理是钱包的职责边界，见 [[07-non-goals]]；协议层无法控制客户端安全性。

### R4：接收方转发共享（B 转 C）

**描述**：接收方 B 在获得共享 record 后，可调用协议的 `share_pii` transition（如果协议不做限制）将 record 再次共享给 C，或直接将解密后的明文以链下方式传递给 C。

**缓解方向**：在协议设计中考虑为共享 record 设置 `transferable: bool` 字段，若 `false` 则 transition 层拒绝二次共享；但链下泄露仍无法阻止（属于 R1 的子集）。

---

## 7. 威胁矩阵

| 攻击者 | 目标资产 | 攻击路径 | 协议层缓解 | 应用层缓解 | 残余风险 |
|--------|---------|---------|-----------|-----------|---------|
| 链上观察者 | 链上 record 密文 | 扫描全链 ciphertext | record 字段默认 private，owner 加密不可见 [^1] | 无需额外处理 | 元数据/频率分析泄露行为模式 |
| 链上观察者 | revocation mapping | 读取公开 mapping | mapping 本身设计为公开可查（业务需要） | 最小化 mapping key 信息量（用 nonce 而非 address） | mapping 存在即说明某地址有 PII 活动 |
| 恶意 dApp | PII 明文 | 钓鱼弹窗诱导用户授权 `share_pii` | transition 执行需 Leo Wallet 弹窗用户确认 [^2] | 弹窗显示共享类型与接收方；`UponRequest` 权限模式 | 用户判断失误后无法撤回已解密明文（R1） |
| 恶意 dApp | 超量 PII | 一次请求全部 PII 类型 | 无协议层限制 | `requested_category` 字段约束 + 前端 UI 最小披露 | 用户主动全量授权场景（R1） |
| 钱包被盗 | 私钥/view key | 恶意插件/钓鱼/OS 攻击 | snarkVM 层无法阻止密钥泄露 | 钱包安全教育；不在非官方页面输入助记词 | 密钥泄露后历史全部 PII 曝光（R3） |
| 接收方滥用 | PII 明文（已解密） | 解密后链下传播/出售 | 无（协议层不控制链下数据） | 撤销 nonce（仅阻止后续 on-chain 使用）；UI 警示 | 链下泄露无技术解（R1、R4） |
| 接收方滥用 | 二次共享 record | 调用 `share_pii` 转发 record | 无默认限制 | `transferable: bool` 字段设计 | 接收方解密后链下重新加密（R4） |

---

[^1]: record 的 `owner` 默认 `private`，链上无法从 record 直接看出 owner 是谁，必须通过 view key 试解密匹配。见 `_research/aleo-status-2026-05.md#26-private-vs-public-语义`
[^2]: Leo Wallet `requestTransaction` 触发用户授权弹窗，dApp 无法绕过此步骤静默执行 transition。见 `_research/aleo-status-2026-05.md#33-关键-api-方法签名`
[^3]: snarkVM 的 ZK 证明保障：在不持有 spending key 的情况下无法生成有效 transition proof。见 `_research/aleo-status-2026-05.md#73-加密机制无需开发者手写`
[^4]: Leo Wallet 本地 keystore 安全性依赖浏览器扩展沙箱，属于 Leo Wallet（`@demox-labs/aleo-wallet-adapter-leo`）的职责范围。见 `_research/aleo-status-2026-05.md#3-leo-wallet-能力`
[^5]: ZK transition 的输入隐私：private 输入不出现在链上公开数据中，链上仅有 commitment 和 proof。见 `_research/aleo-status-2026-05.md#26-private-vs-public-语义`
[^6]: snarkOS v4.0.0 升级：recipient 可用 account view key 解密 sender address。见 `_research/aleo-status-2026-05.md#14-snarkos--snarkvm-版本`
[^7]: `DecryptPermission.UponRequest` 每次解密前向用户确认，是 PII 协议的推荐权限模式。见 `_research/aleo-status-2026-05.md#34-程序化-record-解密核心问题`
[^8]: testnet 稳定性风险与 RPC endpoint 版本问题。见 `_research/aleo-status-2026-05.md#81-文档工具链-known-gaps`
