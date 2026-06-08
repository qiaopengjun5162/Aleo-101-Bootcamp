# Aleo 合规转账审计系统

> 基于 Aleo 零知识证明的隐私合规转账与审计方案

---

## 五大模块

| # | 模块 | 核心组件 | 隐私级别 |
|---|------|----------|----------|
| 1 | **隐私交易记录** | `CompliantTransfer` record | 完全私密 |
| 2 | **审计日志** | `AuditLogEntry` struct + `audit_logs` mapping | 链上公开 |
| 3 | **审计授权** | `authorize_auditor` / `revoke_auditor` | 管理员管控 |
| 4 | **隐私转账** | `mint` / `compliant_transfer` | 隐私 + 合规哈希 |
| 5 | **授权审计方** | `check_auditor_authorization` / `check_compliance` | 公开查询 |

`CompliantTransfer` 为私有 record，仅持有人本地可见。链上仅存合规哈希，不泄露金额和交易方。

---

## 项目结构

```
├── src/main.leo       # 主合约
├── tests/             # 测试套件
├── program.json       # Leo 配置
└── .gitignore
```

---

## 快速开始

- **Leo** >= 4.0.2

```bash
leo build   # 编译
leo test    # 测试
```

| 测试用例 | 场景 | 预期 |
|----------|------|------|
| `test_mint` | 铸造记录并验证字段 | 通过 |
| `test_compliance` | 查询合规哈希 | 通过 |
| `test_get_log` | 查询审计日志 | 通过 |
| `test_bad_action` | 无效审计动作 | 拒绝 |
| `test_unauthorized` | 未授权审计 | 拒绝 |

---

## 合约函数

```leo
fn initialize(admin_addr: address) -> Final
fn mint_compliant_transfer(receiver, amount, data, salt) -> (CompliantTransfer, Final)
fn compliant_transfer(tok, receiver, data, salt) -> (CompliantTransfer, Final)
fn authorize_auditor(auditor: address) -> Final
fn revoke_auditor(auditor: address) -> Final
fn log_audit_action(transfer_id, action, note) -> Final    // action: 0=查看 1=批准 2=拒绝
fn check_auditor_authorization(auditor: address) -> Final
fn check_compliance(transfer_id: field) -> Final
fn get_audit_log(log_id: field) -> Final
```

### 数据结构

```leo
record CompliantTransfer {
    owner: address,         // 当前持有人
    origin: address,        // 原始发起方（永不变更）
    from: address,          // 上一手发送方
    to: address,            // 接收方
    amount: u64,            // 转账金额
    transfer_id: field,     // 转账编号
    compliance_hash: field, // 合规数据哈希
}

struct AuditLogEntry {
    log_id: field,
    transfer_id: field,
    auditor: address,
    action: u8,            // 0=查看 1=批准 2=拒绝
    note: field,
}
```

---

## 安全设计

| 函数 | 权限 |
|------|------|
| `initialize` | 仅首次调用（contains 防重入） |
| `authorize_auditor` | 仅管理员 |
| `revoke_auditor` | 仅管理员 |
| `log_audit_action` | 仅授权审计方 |
| `compliant_transfer` | 仅 record 持有人 |

- **Record 消费**：转账时旧 record 被消费，无法双花
- **origin 追踪**：`origin` 字段永不更改，确保完整审计追溯链

---

## 部署

```bash
leo deploy --network testnet --broadcast --yes
leo execute --network testnet --broadcast --yes initialize <admin>
leo execute --network testnet --broadcast --yes mint_compliant_transfer <receiver> <amount>u64 <data>field <salt>field
leo execute --network testnet --broadcast --yes authorize_auditor <auditor>
leo execute --network testnet --broadcast --yes compliant_transfer "<ciphertext>" <receiver> <data>field <salt>field
leo execute --network testnet --broadcast --yes log_audit_action <transfer_id>field <action>u8 <note>field
```

---

## License

MIT
