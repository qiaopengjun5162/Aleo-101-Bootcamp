# Task 4 — Private Auction（隐私拍卖）

基于 Aleo Leo 实现的**密封式拍卖**（Sealed-bid Auction）：出价金额在出价阶段对所有人（包括拍卖发起者）完全不可见，只有揭示阶段才进入链上比较；未中标者的出价金额可以选择**永远不揭示**，永远保持隐私。

> 这正是 ZK 在真实世界拍卖中的杀手级用法 —— 传统链上拍卖（以太坊）人人都看得见出价，导致跟单 / 阴谋 / 价格泄露。Aleo 用 record + ZK 证明天然解决了这个问题。

---

## 项目结构

```
task4_project/
├── program/
│   ├── program.json            # 程序元数据
│   ├── .env.example            # 部署/执行所需环境变量模板
│   └── src/main.leo            # Leo 4.x 源代码（隐私拍卖核心逻辑）
├── scripts/
│   ├── deploy.ps1              # Windows / PowerShell 部署脚本
│   ├── deploy.sh               # Linux / macOS 部署脚本
│   └── execute_examples.md     # 5 条命令走完整一轮拍卖
├── screenshot/                 # 链上交互截图（部署+execute 后填）
└── README.md
```

---

## 合约设计

### 数据结构

| 类型      | 名称             | 隐私性       | 作用                               |
|-----------|------------------|--------------|------------------------------------|
| `mapping` | `auctions`       | 公开链上     | `auction_id => AuctionInfo`        |
| `struct`  | `AuctionInfo`    | 公开         | 卖家 / 物品 ID / 截止区块 / 最高价 |
| `record`  | `Bid`            | **私密**     | 出价者钱包内的密封出价单           |

### 4 个 transition

| transition          | 谁调用     | 链上看到           | 链上看不到（受 ZK 保护） |
|---------------------|-----------|--------------------|--------------------------|
| `create_auction`    | 卖家      | 起拍价、截止区块   | —                        |
| `submit_bid`        | 出价者    | 仅一个 commitment  | **出价金额、出价者关系** |
| `reveal_bid`        | 出价者    | 揭示金额、出价者   | 出价者其它未揭示出价     |
| `finalize_auction`  | 任何人    | 最终 winner+价格   | —                        |

### 隐私保证（ZK 部分）

1. **submit_bid**：链上只产生 `Bid` 的 commitment，金额加密存储在出价者钱包；任何观察者（包括卖家）都无法看到金额。
2. **reveal_bid**：合约内 `assert_eq(bid.amount, amount)` 由 ZK 电路约束，**证明揭示金额 = record 真实金额**，无法欺骗。
3. **未揭示**：未在揭示窗口内调用 `reveal_bid` 的出价者，对链上所有人来说**等于从未出过价**，金额永久隐私。

---

## 完整运行流程

### 0. 准备工作

```bash
# 安装 Leo CLI 4.x（任选一种）
cargo install leo-lang leo-fmt leo-lsp
# 或
cargo binstall leo-lang
# 或直接从 https://github.com/ProvableHQ/leo/releases 下载预编译二进制

# 创建 / 导入测试网账户
leo account new

# 通过 https://faucet.provable.com/ 给地址领测试币
```

### 1. 编译 + 部署

先把 `program/.env.example` 复制为 `program/.env` 并填上你的私钥，再运行：

```powershell
# Windows
cd task4_project\program
..\scripts\deploy.ps1
```

```bash
# Linux/macOS
cd task4_project/program
../scripts/deploy.sh
```

### 2. 链上交互

详见 [`scripts/execute_examples.md`](scripts/execute_examples.md)，按编号顺序跑：

1. `create_auction` —— 卖家创建拍卖
2. `submit_bid` × N —— 多个出价者隐私出价
3. （等出价窗口结束）
4. `reveal_bid` × N —— 想中标的出价者揭示
5. （等揭示窗口结束）
6. `finalize_auction` —— 任何人锁定结果

### 3. 查询结果

```bash
curl https://api.explorer.provable.com/v1/testnet/program/private_auction_nontracey.aleo/mapping/auctions/1u64
```

或者直接打开浏览器：
```
https://testnet.aleoscan.io/program?id=private_auction_nontracey.aleo
```

---

## 真实场景落地价值

| 场景           | 传统链上痛点               | private_auction 的解法           |
|----------------|--------------------------|----------------------------------|
| NFT 拍卖       | 出价人人可见 → 跟单狙击   | 出价金额完全隐私                 |
| 国债 / 频谱拍卖 | 投标方策略全公开          | 密封投标 + ZK 证明合法性         |
| 域名拍卖       | 反复加价博弈 → 用户疲劳   | 一次性密封出价，谁最高谁赢       |
| 招标采购       | 投标价格泄露给竞争对手    | 投标永久不暴露（除非自己揭示）   |
