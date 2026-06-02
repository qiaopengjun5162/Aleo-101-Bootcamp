---
doc: 05-wallet-integration
phase: 4
status: stable
last_review: 2026-05-29
related: [[03-program-interface]], [[04-interop-standard]]
---

# Aleo PII Protocol — Leo Wallet 集成规范

> 相关文档：[[04-interop-standard]] | [[06-acceptance-criteria]]
>
> **范围**：本文档覆盖 PII Protocol 前端与 Leo Wallet 的所有集成点，包括安装配置、API 调用规范、PII 操作映射、错误处理及调试指引。

---

## 目录

1. [Leo Wallet 集成总览](#1-leo-wallet-集成总览)
2. [关键 API 使用规范](#2-关键-api-使用规范)
3. [Aleo PII Protocol 的钱包调用映射](#3-aleo-pii-protocol-的钱包调用映射)
4. [关键 UX 要求](#4-关键-ux-要求)
5. [错误处理](#5-错误处理)
6. [调试与开发 Tips](#6-调试与开发-tips)
7. [已知限制与 Workaround](#7-已知限制与-workaround)

---

## 1. Leo Wallet 集成总览

### 1.1 安装与基础配置

Leo Wallet 通过 `@demox-labs` npm scope 发布。注意：仓库已迁移至 `ProvableHQ/aleo-wallet-adapter`，但 **npm 包名保持 `@demox-labs/*` 不变**，以此为锚。

```bash
# 安装全部必要包（使用 bun，按项目规范）
bun add \
  @demox-labs/aleo-wallet-adapter-base \
  @demox-labs/aleo-wallet-adapter-leo \
  @demox-labs/aleo-wallet-adapter-react \
  @demox-labs/aleo-wallet-adapter-reactui
```

> **版本锁定建议**：在 `script/dev.sh` 启动前执行 `bun add @demox-labs/aleo-wallet-adapter-leo@latest` 获取最新版本号，随后固化到 `package.json` 的精确版本，避免引入非预期的 breaking change。具体小版本号需通过 `npm view @demox-labs/aleo-wallet-adapter-leo version` 实时核对——**待 Phase 1 验证**。

**基础配置文件**：

```typescript
// src/config/wallet.ts
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export const ALEO_NETWORK = WalletAdapterNetwork.Testnet;  // 开发阶段

export const PII_PROGRAM_ID = "pii_protocol_v1.aleo";

export const TESTNET_RPC_ENDPOINT = "https://api.explorer.provable.com/v1/testnet";
```

### 1.2 WalletProvider 的 React 集成方案

在应用根组件包裹 `WalletProvider`，配置可接受的钱包适配器列表：

```tsx
// src/App.tsx
import React, { useMemo } from "react";
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { ALEO_NETWORK, PII_PROGRAM_ID } from "./config/wallet";

// 导入预制 UI 样式（可选，也可自定义）
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

export function App() {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({ appName: "Aleo PII Manager" }),
    ],
    []
  );

  return (
    <WalletProvider
      wallets={wallets}
      network={ALEO_NETWORK}
      decryptPermission={DecryptPermission.UponRequest}  // PII 协议推荐：每次询问用户
      programs={[PII_PROGRAM_ID]}                         // 限定解密范围
      autoConnect={false}                                 // 主动连接，不自动连接
    >
      <WalletModalProvider>
        {/* 应用内容 */}
      </WalletModalProvider>
    </WalletProvider>
  );
}
```

**关键参数说明**：

- `decryptPermission`：控制钱包对该 dApp 的解密权限级别。PII 协议 MUST 使用 `UponRequest`（每次操作均弹窗征得用户同意），MUST NOT 使用 `AutoDecrypt`。完整枚举值列表——**待 Phase 1 验证**（需读 `@demox-labs/aleo-wallet-adapter-base` 源码确认）。
- `programs`：将钱包解密范围限定为 `pii_protocol_v1.aleo`，防止钱包在其他 program 的 record 上触发解密。
- `autoConnect`：建议 `false`，由用户主动点击连接，避免页面加载即弹出钱包授权请求。

---

## 2. 关键 API 使用规范

所有 API 通过 `useWallet()` hook 获取。以下为每个关键 API 的 TypeScript 签名、使用场景及注意事项。

### 2.1 `connect` — 连接钱包

**TypeScript 签名**：

```typescript
connect(
  decryptPermission: DecryptPermission,
  network: WalletAdapterNetwork,
  programs?: string[]
): Promise<void>
```

**使用场景**：用户首次访问 dApp，或会话过期需要重新建立钱包连接。

**使用示例**：

```typescript
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { DecryptPermission, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

function ConnectButton() {
  const { connect, connected, connecting } = useWallet();

  const handleConnect = async () => {
    try {
      await connect(
        DecryptPermission.UponRequest,
        WalletAdapterNetwork.Testnet,
        ["pii_protocol_v1.aleo"]
      );
    } catch (error) {
      // 见第 5 节错误处理
      handleWalletError(error);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={connected || connecting}
    >
      {connecting ? "连接中..." : connected ? "已连接" : "连接钱包"}
    </button>
  );
}
```

**注意事项**：
- `programs` 数组中的 program ID MUST 与链上已部署的 program 匹配，否则解密范围声明无效。
- `connect` 结果通过 `useWallet()` 的 `connected`、`publicKey` 响应式字段反映，不要依赖返回值。

### 2.2 `requestRecordPlaintexts` — 拉取并解密自有 records

**TypeScript 签名**：

```typescript
requestRecordPlaintexts(
  program: string
): Promise<AleoRecord[]>
```

**AleoRecord 结构**（简化）：

```typescript
interface AleoRecord {
  id: string;                     // record commitment（唯一标识）
  owner: string;                  // owner address（自己的地址）
  program_id: string;             // program ID
  recordName: string;             // record 类型名，如 "PIIRecord"、"SharedPIIRecord"
  spent: boolean;                 // 是否已被消耗（UTXO spent）
  data: Record<string, string>;   // 各字段的明文值（已解密）
}
```

**使用场景**：用户查看自己的 PII 列表；接收方 dApp 扫描 SharedPIIRecord。

**使用示例**：

```typescript
function usePIIRecords() {
  const { requestRecordPlaintexts, publicKey } = useWallet();
  const [records, setRecords] = useState<AleoRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const allRecords = await requestRecordPlaintexts("pii_protocol_v1.aleo");
      // 过滤出未消耗的 PIIRecord
      const piiRecords = allRecords.filter(
        r => r.recordName === "PIIRecord" && !r.spent
      );
      setRecords(piiRecords);
    } catch (error) {
      handleWalletError(error);
    } finally {
      setLoading(false);
    }
  };

  return { records, loading, fetchRecords };
}
```

**关键注意事项**：
- 此 API 需要 `DecryptPermission.OnChainHistory` 权限——**待 Phase 1 验证**（需确认是否需要单独声明）。若使用 `UponRequest`，每次调用可能触发用户弹窗。
- record 扫描依赖钱包用 view key 试解密所有相关 ciphertext，首次可能较慢（见第 7 节已知限制）。
- `spent: true` 的 record 为已消耗，UI 中 MUST 不展示为可用状态。

### 2.3 `requestExecution` — 执行 transition（提交 transaction）

> **注意**：根据调研报告，Leo Wallet 暴露的是 `requestTransaction(aleoTransaction)` 而非 `requestExecution`。在 `@demox-labs/aleo-wallet-adapter-react` 的 `useWallet()` hook 中，实际调用名可能为 `requestTransaction`。以下以 `requestExecution` 为逻辑名称，具体方法名待 Phase 1 验证后统一。

**TypeScript 签名**（概念定义）：

```typescript
// AleoTransaction 构建类型（来自 @demox-labs/aleo-wallet-adapter-base）
interface AleoTransaction {
  address: string;          // 调用方地址（publicKey）
  chainId: string;          // "testnetbeta" for testnet
  transitions: {
    program: string;        // "pii_protocol_v1.aleo"
    functionName: string;   // transition 名称
    inputs: string[];       // Leo 类型字面量，如 "1u8", "aleo1..."
  }[];
  fee: number;              // credits，如 0.01
  feePrivate: boolean;      // 是否使用私有 credits 支付手续费
}

requestTransaction(
  aleoTransaction: AleoTransaction
): Promise<{ transactionId?: string }>
```

**使用场景**：所有需要修改链上状态的操作（create_pii、update_pii、delete_pii、share_pii、consume_shared）。

**使用示例（create_pii）**：

```typescript
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

function useCreatePII() {
  const { requestTransaction, publicKey } = useWallet();

  const createPII = async (category: number, encodedPayload: string[]) => {
    if (!publicKey) throw new Error("Wallet not connected");

    const currentBlock = await getCurrentBlockHeight();

    const aleoTx: AleoTransaction = {
      address: publicKey,
      chainId: "testnetbeta",
      transitions: [{
        program: "pii_protocol_v1.aleo",
        functionName: "create_pii",
        inputs: [
          // 完整 PIIPayload struct 字面量（Leo 格式）
          `{ category: ${category}u8, label_lo: 0u128, label_hi: 0u128, data: [${encodedPayload.join(", ")}], data_len: ${encodedPayload.filter(Boolean).length * 16}u32 }`,
          generateNonce(),        // nonce: field
          "1u8",                  // version: u8
          `${currentBlock}u64`,   // created_at: u64（当前块高）
        ],
      }],
      fee: 0.01,
      feePrivate: false,
    };

    const result = await requestTransaction(aleoTx);
    return result.transactionId;
  };

  return { createPII };
}
```

**注意事项**：
- `inputs` 中的每个值 MUST 以 Leo 类型字面量格式传入（如 `"1u8"`、`"100u32"`、`"aleo1..."`），而非原始 JavaScript 值。
- `fee` 单位为 credits（非 millicredits），最低建议 0.005，实际根据 transition 复杂度调整。
- 返回的 `transactionId` 用于后续轮询交易状态（见 2.5）。

### 2.4 `decrypt` — 解密特定密文

**TypeScript 签名**：

```typescript
decrypt(
  cipherText: string,
  tpk?: string,              // transition public key（可选，提高解密精度）
  programId?: string,        // 所属 program ID（可选）
  functionName?: string,     // 所属 transition 名（可选）
  index?: number             // record 在 transition 输出中的索引（可选）
): Promise<{ text: string }>
```

**使用场景**：当 dApp 已知具体的 record ciphertext（如从 indexer 获取），需要解密特定字段时使用。与 `requestRecordPlaintexts` 的区别：后者批量扫描，前者精确解密。

**使用示例**：

```typescript
async function decryptSpecificRecord(ciphertext: string): Promise<string> {
  const { decrypt } = useWallet();

  const result = await decrypt(
    ciphertext,
    undefined,
    "pii_protocol_v1.aleo",
    "create_pii",
    0  // 第一个输出 record
  );
  return result.text;
}
```

**注意事项**：
- 每次调用会触发钱包弹窗（`DecryptPermission.UponRequest` 下），不适合批量场景。
- 可选参数（`tpk`、`programId`、`functionName`、`index`）有助于钱包定位正确的解密密钥，建议尽量提供。

### 2.5 `signMessage` — 签名任意消息

**TypeScript 签名**：

```typescript
signMessage(
  bytes: Uint8Array
): Promise<{ signature: Uint8Array }>
```

**使用场景**：dApp 会话登录（无需上链的身份证明）。用户签名一段包含 nonce 和时间戳的消息，dApp 验证签名与 `publicKey` 的对应关系，完成无密码登录。

**标准登录载荷格式**（见第 4.1 节详细说明）。

### 2.6 `requestBulkTransactions` — 批量执行

**TypeScript 签名**：

```typescript
requestBulkTransactions(
  transactions: AleoTransaction[]
): Promise<{ transactionIds?: string[] }>
```

**使用场景**：一次授权多个 transition（如同时共享 PII 给多个 dApp）。

**注意**：`requestBulkTransactions` 在 Leo Wallet 当前版本的实际可用性——**待 Phase 1 验证**（见第 7 节）。

---

## 3. Aleo PII Protocol 的钱包调用映射

### 3.1 操作 → API 完整映射表

| PII 操作 | Leo Program Transition | 钱包 API | 权限要求 |
|---------|----------------------|---------|---------|
| 创建 PII | `create_pii` | `requestTransaction` | 基础连接 |
| 查看自己的 PII | — | `requestRecordPlaintexts` | `UponRequest` / `OnChainHistory` |
| 编辑 PII | `update_pii` | `requestTransaction` | 基础连接 |
| 删除 PII | `delete_pii` | `requestTransaction` | 基础连接 |
| 共享 PII | `share_pii` | `requestTransaction` | 基础连接 |
| 接收方查看共享 | — | `requestRecordPlaintexts` | `UponRequest` / `OnChainHistory` |
| 销毁共享 record | `consume_shared` | `requestTransaction` | 基础连接 |
| dApp 登录 | — | `signMessage` | 基础连接 |
| 查询交易状态 | — | `transactionStatus` | 无需授权 |

### 3.2 创建 PII

```typescript
// src/hooks/usePIIOperations.ts

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { encodePIIPayload } from "../utils/payload";

export function useCreatePII() {
  const { requestTransaction, publicKey } = useWallet();

  /**
   * 创建一条新的 PIIRecord
   * @param category - PII 类别（0=address, 1=phone, 2=email, 3=custom）
   * @param plaintext - 用户输入的明文字符串
   */
  const createPII = async (category: number, plaintext: string): Promise<string> => {
    if (!publicKey) throw new WalletNotConnectedError();

    // 将明文字符串打包为 [u128; 13] 格式（每个 u128 装 16 字节 UTF-8，共 208 字节）
    const { data: encodedData, dataLen } = encodePIIPayload(plaintext);

    const currentBlock = await getCurrentBlockHeight();

    // PIIPayload struct 字面量，data 字段为 13 元素数组
    // 格式示例：{ category: 1u8, label_lo: 0u128, label_hi: 0u128,
    //            data: [12345u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
    //            data_len: 100u32 }
    const payloadStruct = `{ category: ${category}u8, label_lo: 0u128, label_hi: 0u128, data: [${encodedData.join(", ")}], data_len: ${dataLen}u32 }`;

    const tx: AleoTransaction = {
      address: publicKey,
      chainId: "testnetbeta",
      transitions: [{
        program: "pii_protocol_v1.aleo",
        functionName: "create_pii",
        inputs: [
          payloadStruct,         // payload: PIIPayload（完整 struct 字面量）
          generateNonce(),        // nonce: field，格式如 "1234567890field"
          "1u8",                  // version: u8（当前版本固定为 1）
          `${currentBlock}u64`,   // created_at: u64（当前块高）
        ],
      }],
      fee: 0.01,
      feePrivate: false,
    };

    const result = await requestTransaction(tx);
    if (!result.transactionId) throw new TransitionFailedError("create_pii 未返回 transactionId");
    return result.transactionId;
  };

  return { createPII };
}
```

### 3.3 查看自己的 PII

```typescript
export function usePIIList() {
  const { requestRecordPlaintexts } = useWallet();
  const [piiList, setPIIList] = useState<PIIRecord[]>([]);

  const refresh = async () => {
    const records = await requestRecordPlaintexts("pii_protocol_v1.aleo");
    const unspent = records
      .filter(r => r.recordName === "PIIRecord" && !r.spent)
      .map(r => ({
        id: r.id,
        category: parseInt(r.data.category),
        payload: decodePIIPayload(r.data.payload),  // [u128; 13] → 明文字符串
      }));
    setPIIList(unspent);
  };

  return { piiList, refresh };
}
```

### 3.4 编辑 PII

编辑在 Aleo UTXO 模型中等同于"消耗旧 record，产出新 record"：

```typescript
const updatePII = async (
  oldRecord: AleoRecord,     // 当前持有的 PIIRecord（作为 transition 输入被消耗）
  newPlaintext: string
): Promise<string> => {
  const encodedPayload = encodePIIPayload(newPlaintext);

  const tx: AleoTransaction = {
    address: publicKey!,
    chainId: "testnetbeta",
    transitions: [{
      program: "pii_protocol_v1.aleo",
      functionName: "update_pii",
      inputs: [
        oldRecord.id,           // 被消耗的旧 record（Leo program 接收 PIIRecord 类型）
        encodedPayload,
        generateNonce(),
      ],
    }],
    fee: 0.01,
    feePrivate: false,
  };

  const result = await requestTransaction(tx);
  return result.transactionId!;
};
```

**注意**：成功后旧 record 变为 `spent: true`，新 record 出现在 `requestRecordPlaintexts` 结果中。UI 需等待链上确认（轮询 `transactionStatus`）后再刷新列表。

### 3.5 共享 PII

```typescript
const sharePII = async (
  sourceRecord: AleoRecord,
  recipientAddress: string,
  expiresInBlocks: number,
  purpose: number
): Promise<string> => {
  const currentBlock = await getCurrentBlockHeight();  // 从 RPC endpoint 查询

  const tx: AleoTransaction = {
    address: publicKey!,
    chainId: "testnetbeta",
    transitions: [{
      program: "pii_protocol_v1.aleo",
      functionName: "share_pii",
      inputs: [
        sourceRecord.id,
        recipientAddress,
        `${currentBlock + expiresInBlocks}u64`,  // expires_at: u64（绝对块高）
        `${purpose}u128`,                          // purpose: u128（用途码，见 02-data-model.md）
        generateNonce(),                            // new_nonce: field
        `${currentBlock}u64`,                      // shared_at: u64（当前块高）
      ],
    }],
    fee: 0.01,
    feePrivate: false,
  };

  const result = await requestTransaction(tx);
  return result.transactionId!;
};
```

---

## 4. 关键 UX 要求

### 4.1 "登录"流程：使用 signMessage 的标准载荷格式

**设计原则**：PII Protocol 的"登录"是无状态的签名验证，不依赖链上操作，不消耗 credits。

**标准载荷格式**：

```typescript
// 登录消息载荷（使用 TextEncoder 转为 Uint8Array）
interface LoginPayload {
  domain: string;       // dApp 域名，防止跨域重放，如 "pii.example.com"
  nonce: string;        // 服务端生成的随机 UUID v4，一次性使用
  timestamp: number;    // Unix 时间戳（秒），有效期建议 5 分钟
  address: string;      // 用户的 Aleo address（自填，服务端校验与签名 pubkey 一致）
  version: "1.0";       // 协议版本
}

// 序列化为规范字符串（确定性顺序，无多余空格）
function serializeLoginPayload(payload: LoginPayload): string {
  return [
    `domain:${payload.domain}`,
    `nonce:${payload.nonce}`,
    `timestamp:${payload.timestamp}`,
    `address:${payload.address}`,
    `version:${payload.version}`,
  ].join("|");
}

// 编码为 Uint8Array
const message = new TextEncoder().encode(
  serializeLoginPayload(loginPayload)
);
```

**完整登录流程**：

```typescript
async function loginWithAleo(): Promise<string> {
  const { signMessage, publicKey } = useWallet();

  // Step 1：从服务端获取 nonce（防重放）
  const { nonce } = await fetch("/api/auth/nonce").then(r => r.json());

  // Step 2：构建标准载荷
  const payload: LoginPayload = {
    domain: window.location.hostname,
    nonce,
    timestamp: Math.floor(Date.now() / 1000),
    address: publicKey!,
    version: "1.0",
  };

  const messageBytes = new TextEncoder().encode(
    serializeLoginPayload(payload)
  );

  // Step 3：请求钱包签名（触发 Leo Wallet 弹窗）
  const { signature } = await signMessage(messageBytes);

  // Step 4：提交给服务端验证
  const { token } = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload,
      signature: Buffer.from(signature).toString("base64"),
    }),
  }).then(r => r.json());

  return token;  // JWT 或 session token
}
```

**服务端验证逻辑**（伪代码）：

```typescript
// 服务端
function verifyAleoSignature(
  payload: LoginPayload,
  signatureBase64: string
): boolean {
  // 1. 检查 nonce 未被使用过（防重放）
  // 2. 检查 timestamp 在 5 分钟内（防过期重放）
  // 3. 验证 Aleo 签名算法（snarkVM 的 address.verify 或等效库）
  // 4. 确认签名的 address 与 payload.address 一致
  // ⚠️ Aleo 签名验证库的具体 npm 包待 Phase 1 确认
}
```

### 4.2 多账户切换的处理

Leo Wallet 支持多账户，`publicKey` 可能在用户操作中切换：

```typescript
function usePIIApp() {
  const { publicKey, connected } = useWallet();
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey && publicKey !== currentAddress) {
      // 账户切换：清空当前会话数据，重新加载
      setCurrentAddress(publicKey);
      clearPIICache();
      refreshPIIList();
    }
  }, [publicKey]);

  useEffect(() => {
    if (!connected) {
      // 断开连接：清空会话
      setCurrentAddress(null);
      clearPIICache();
    }
  }, [connected]);
}
```

### 4.3 网络不一致警告

dApp 运行在 testnet，但用户钱包可能已切换到 mainnet：

```typescript
function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();

  // Leo Wallet 在连接时已声明 network，若用户切换会触发重连
  // 但为安全起见，建议在关键操作前检查链上实际块高来源
  const [networkMismatch, setNetworkMismatch] = useState(false);

  useEffect(() => {
    if (!connected) return;
    // 简单检测：尝试访问 testnet endpoint，若 publicKey 是 mainnet 地址则可能出错
    // 完整的网络检测方案待 Phase 1 实测
    checkNetworkConsistency().then(match => setNetworkMismatch(!match));
  }, [connected]);

  if (networkMismatch) {
    return (
      <div className="network-warning">
        ⚠️ 网络不一致：请在 Leo Wallet 中切换到 Testnet
      </div>
    );
  }
  return <>{children}</>;
}
```

---

## 5. 错误处理

### 5.1 错误分类与处理策略

```typescript
// src/utils/wallet-errors.ts

import { WalletError } from "@demox-labs/aleo-wallet-adapter-base";

export function handleWalletError(error: unknown): never {
  if (error instanceof WalletError) {
    switch (error.name) {
      case "WalletNotConnectedError":
        throw new PIIError(ErrorCode.WALLET_NOT_CONNECTED, "请先连接 Leo Wallet");

      case "WalletConnectionError":
        throw new PIIError(ErrorCode.WALLET_NOT_CONNECTED, "钱包连接失败，请检查 Leo Wallet 是否已安装");

      case "WalletNotReadyError":
        throw new PIIError(ErrorCode.WALLET_NOT_CONNECTED, "Leo Wallet 未就绪，请刷新页面");

      default:
        // 通用 WalletError，通常是用户操作引起
        if (error.message?.includes("User rejected")) {
          throw new PIIError(ErrorCode.USER_REJECTED, "用户取消了操作");
        }
        throw new PIIError(ErrorCode.TRANSITION_FAILED, error.message ?? "未知钱包错误");
    }
  }

  // 非 WalletError（如网络超时）
  if (error instanceof Error) {
    if (error.message.includes("timeout") || error.message.includes("ECONNREFUSED")) {
      throw new PIIError(ErrorCode.NETWORK_MISMATCH, "无法连接到 Aleo 网络，请检查网络设置");
    }
  }

  throw new PIIError(ErrorCode.TRANSITION_FAILED, String(error));
}
```

### 5.2 用户拒绝授权

```typescript
// 用户在钱包弹窗中点击"拒绝"
try {
  await requestTransaction(tx);
} catch (error) {
  if (isUserRejected(error)) {
    // 轻量提示，不弹模态框，让用户自然继续
    showToast("已取消操作", "info");
    return;  // 不抛出错误，不影响 UI 状态
  }
  throw error;  // 其他错误继续向上传递
}

function isUserRejected(error: unknown): boolean {
  return (
    error instanceof WalletError &&
    (error.name === "WalletUserRejectedError" ||
     error.message?.toLowerCase().includes("user rejected") ||
     error.message?.toLowerCase().includes("cancelled"))
  );
}
```

### 5.3 钱包未连接

```typescript
// 高阶组件：操作前自动检查连接状态
function withWalletCheck<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args) => {
    const { connected, connect } = useWallet();
    if (!connected) {
      // 自动触发连接流程
      await connect(
        DecryptPermission.UponRequest,
        WalletAdapterNetwork.Testnet,
        ["pii_protocol_v1.aleo"]
      );
    }
    return fn(...args);
  }) as T;
}
```

### 5.4 网络不一致

```typescript
const NETWORK_ERROR_PATTERNS = [
  "network mismatch",
  "wrong network",
  "chainId",
  "testnet",
  "mainnet",
];

function isNetworkMismatch(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p));
}

// 处理
if (isNetworkMismatch(error)) {
  showModal({
    title: "网络不一致",
    message: "您的 Leo Wallet 当前连接的网络与本应用不匹配。\n请在钱包设置中切换到 Testnet。",
    action: "打开设置",
    onAction: () => window.open("leo://settings/network"),
  });
}
```

### 5.5 Record 扫描超时

```typescript
const RECORD_SCAN_TIMEOUT_MS = 30_000;  // 30 秒

async function fetchRecordsWithTimeout(programId: string): Promise<AleoRecord[]> {
  const { requestRecordPlaintexts } = useWallet();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("record_scan_timeout")), RECORD_SCAN_TIMEOUT_MS)
  );

  try {
    return await Promise.race([
      requestRecordPlaintexts(programId),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "record_scan_timeout") {
      showToast("数据加载超时，请稍后重试", "warning");
      return [];  // 返回空数组，允许用户手动重试
    }
    throw error;
  }
}
```

---

## 6. 调试与开发 Tips

### 6.1 Testnet Credits 获取

```bash
# 方式 1：官方 Faucet（推荐，无需验证）
# 访问 https://faucet.aleo.org/，粘贴地址即可
# 单次约 15 credits

# 方式 2：Leo Wallet 内置 Faucet 按钮
# 在 Leo Wallet 扩展界面直接点击

# 方式 3：Discord Faucet（需要 Discord 验证）
# 在 Aleo 官方 Discord 的 #testnet-faucet 频道发送地址

# 方式 4：Stakely（需要 Twitter 验证）
# https://stakely.io/faucet/aleo-aleo-testnet

# 建议部署前申请多次：中等复杂度 program 部署约 2-10 credits
```

### 6.2 本地开发的钱包 Mock 策略

真实 Leo Wallet 需要浏览器扩展，在 CI 或无 GUI 环境中不可用。以下为 mock 策略：

```typescript
// src/utils/mock-wallet.ts（仅 development 环境使用）

import {
  WalletAdapterNetwork,
  DecryptPermission,
} from "@demox-labs/aleo-wallet-adapter-base";

export class MockLeoWalletAdapter {
  name = "Mock Leo Wallet";
  url = "";
  icon = "";
  readyState = "Installed";

  publicKey = "aleo1test000000000000000000000000000000000000000000000000000000000";

  async connect() {
    console.log("[MockWallet] connect() called");
  }

  async disconnect() {
    console.log("[MockWallet] disconnect() called");
  }

  async signMessage(bytes: Uint8Array) {
    console.log("[MockWallet] signMessage():", new TextDecoder().decode(bytes));
    // 返回固定的 mock 签名
    return { signature: new Uint8Array(64).fill(0) };
  }

  async requestRecordPlaintexts(program: string) {
    console.log("[MockWallet] requestRecordPlaintexts():", program);
    return MOCK_PII_RECORDS;  // 来自 tests/fixtures/mock-records.ts
  }

  async requestTransaction(tx: AleoTransaction) {
    console.log("[MockWallet] requestTransaction():", tx);
    return { transactionId: `mock-tx-${Date.now()}` };
  }

  async decrypt(cipherText: string) {
    console.log("[MockWallet] decrypt():", cipherText);
    return { text: MOCK_DECRYPTED_PLAINTEXT };
  }
}

// 在测试和开发中注入 mock
if (process.env.NODE_ENV === "development" && process.env.MOCK_WALLET === "true") {
  // 替换 wallets 数组中的真实适配器
}
```

**完整 mock 方案说明**：Leo Wallet adapter 库目前没有官方 mock 包，上述方案是手写实现。建议将 mock records fixture 文件放在 `tests/fixtures/mock-records.ts`，同时用于单元测试（L1）。

### 6.3 常用调试命令

```bash
# 查询 testnet 最新块高
curl https://api.explorer.provable.com/v1/testnet/block/height/latest

# 查询特定交易状态
curl https://api.explorer.provable.com/v1/testnet/transaction/<tx_id>

# 查询 program 是否已部署
curl https://api.explorer.provable.com/v1/testnet/program/pii_protocol_v1.aleo

# 查看 npm 包最新版本
npm view @demox-labs/aleo-wallet-adapter-leo version
npm view @demox-labs/aleo-wallet-adapter-base version
```

### 6.4 TypeScript 类型检查

```bash
# 运行类型检查（不生成输出）
bun tsc -b

# 监视模式
bun tsc -b --watch
```

---

## 7. 已知限制与 Workaround

### 7.1 待 Phase 1 验证的事项

以下条目来自调研报告中标注为"待验证"的内容，在 Phase 1 实测前不得在生产代码中假设其行为：

| 编号 | 待验证事项 | 影响 | 临时处理 |
|------|----------|------|---------|
| W-01 | `DecryptPermission` 枚举完整值列表（`NoDecrypt`、`OnChainHistory` 等） | `WalletProvider` 配置可能不完整 | 使用 `UponRequest`，每次弹窗征得用户同意 |
| W-02 | `requestRecordPlaintexts` 是否需要单独的 `OnChainHistory` 权限 | 可能导致 API 调用失败 | 连接时同时声明所有可能用到的权限 |
| W-03 | `@demox-labs/*` 包最新精确版本号 | 版本飘移可能引入 breaking change | `bun add @latest` 后固化版本 |
| W-04 | 单 transition 实测 proof 时延（testnet） | L3 性能门禁阈值无法确定 | 暂定 ≤ 30s，Phase 1 后调整 |
| W-05 | Aleo 签名验证的服务端 npm 库（`signMessage` 结果验证） | 登录流程服务端验证无法完成 | Phase 1 前使用 mock verify，不上生产 |
| W-06 | `requestTransaction` vs `requestExecution` 实际方法名 | hook 调用失败 | 以实际 `useWallet()` 返回值为准 |

### 7.2 `requestBulkTransactions` 生产可用度

**现状**：调研报告确认 `requestBulkTransactions` API 存在于 Leo Wallet adapter 的接口声明中，但生产可用度——**待 Phase 1 验证**。

**风险**：部分文档仅展示语法，未确认 Leo Wallet 扩展侧是否完整实现 bulk 模式的用户弹窗。

**Workaround**：批量共享操作（如同时授权多个 dApp）在 Phase 1 验证前退化为串行 `requestTransaction` 调用，配合加载动画告知用户"正在提交第 X / N 笔交易"。

### 7.3 Record 扫描性能

**问题**：`requestRecordPlaintexts` 底层依赖钱包用 view key 试解密所有区块中的 ciphertext，历史越长越慢。

**Workaround**：
1. 短期：在 UI 层加异步加载态（spinner + 进度提示），不阻塞主界面。
2. 中期：自建轻量 indexer 缓存 `pii_protocol_v1.aleo` 相关的 ciphertext，前端只拉增量，减少全量扫描。
3. 工具：考虑集成 `aleo-record-scanner` npm 包，或使用 Provable Record Scanning Service（官方推荐方案）。

### 7.4 Leo 4.0 语法的旧文档干扰

**问题**：网络上大量 Leo 教程仍使用旧 `transition` / `function` / `finalize` 关键字（Leo < 4.0），按旧教程写代码会在 Leo 4.x CLI 中编译失败。

**规范**：本项目 MUST 使用 `fn` 关键字（Leo 4.x），CI 检查 MUST 使用最新版 `leo` CLI。如发现旧语法的代码，视为 bug 立即修复。

### 7.5 record owner 字段不可链上查询

**问题**：Aleo record 的 `owner` 字段默认 private，公开 indexer 无法按地址过滤 records。

**影响**：前端"我的 PII 列表"功能不能直接调 indexer，必须经由 wallet adapter。

**Workaround**：所有 record 查询走 `requestRecordPlaintexts`（由钱包在本地 view key 解密），不走 REST indexer 的 owner 过滤。

---

*文档版本：draft | 最后更新：2026-05-26*
*相关文档：[[04-interop-standard]] | [[06-acceptance-criteria]]*
