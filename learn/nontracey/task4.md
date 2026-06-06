# Task 4 - 用起来：真实场景落地

> 课程任务原文：将你的 Aleo 应用部署到测试网并完成一次链上交互，提交相关代码，测试网合约地址和链上交互截图。

---

## 1. 应用简介

本次提交的应用是 **`private_auction_nontracey.aleo`（隐私密封拍卖）**，将传统链上拍卖中"出价金额人人可见"这个最大痛点，用 Aleo 的 `record` + ZK 证明从根上解决。

- **业务流程**：创建拍卖 → 密封出价（金额隐藏）→ 揭示阶段 → 最终化结果
- **隐私要点**：
  - 出价金额以 `Bid` record 形式存在出价者私钥下，链上仅能看到 commitment
  - 未中标者可以**永远不揭示**，金额永久隐私
  - 揭示时用 ZK 证明保证 "公开 amount = record 中真实 amount"，无法作弊

完整代码 + 设计文档：[`task4_project/`](./task4_project/)

---

## 2. 项目结构

```
task4_project/
├── program/
│   ├── program.json
│   ├── .env.example          ← 部署/执行所需环境变量模板
│   └── src/main.leo          ← Leo 4.x 源代码
├── scripts/
│   ├── deploy.ps1            ← Windows 部署脚本
│   ├── deploy.sh             ← Linux/macOS 部署脚本
│   └── execute_examples.md   ← 6 条链上交互示例命令
├── screenshot/               ← 链上交互截图
├── .gitignore                ← 忽略 .env / build / outputs
└── README.md
```

> 本地 `leo build --network testnet` 编译通过（Leo CLI v4.2.0，3.01 KB / 500 KB），
> `leo run submit_bid 1u64 250u64 88u64` 也能输出正确的 `Bid` record。
> **本次已实际完成 deploy + 3 步链上交互（见下方表格），不再需要读者复现。**

---

## 3. 测试网合约地址（Program ID）

| 项目         | 值                                                     |
|--------------|--------------------------------------------------------|
| 网络         | Aleo Testnet                                           |
| Program ID   | `private_auction_nontracey.aleo`                                 |
| 部署交易 ID  | `at14uhxfgz8efu02a2j6psjh4gnjvawhp36pf4z7npef2y7lwspsyss6gssc` |
| 部署费用     | 7.67 credits (含合成 SRS + priority fee 1,000,000 μcredits)    |
| 浏览器链接   | https://testnet.aleoscan.io/program?id=private_auction_nontracey.aleo |

> 部署命令（已封装在 `scripts/deploy.ps1` / `deploy.sh`，使用 Leo CLI 4.x）：
> ```bash
> leo deploy \
>     --network testnet \
>     --endpoint https://api.explorer.provable.com/v1 \
>     --priority-fees 1000000 \
>     --broadcast \
>     --json-output \
>     -y
> ```

---

## 4. 链上交互记录

本次完成拍卖生命周期的核心 3 步链上交互：创建 → 密封出价 → 揭示（详见 [`task4_project/scripts/execute_examples.md`](./task4_project/scripts/execute_examples.md)）：

| #   | 函数              | 交易 ID                                                       | 链上看到的内容                       | 备注                          |
|-----|-------------------|---------------------------------------------------------------|--------------------------------------|-------------------------------|
| 1   | `create_auction`  | `at1xg33xg9ex8frt0ypz44e6epad6y3dqyxg32ty7tsrs28htwwvqyqkup8ah` | auction_id=1, item=42, 起拍=100, end_height=16994784, reveal_window=30 | auction #1                    |
| 2   | `submit_bid`      | `at1t3kc4lh5xsth0s3phmvdthssfn8ph3p6qvnrr3e8eprg3w6alvyq47rkx6` | **只有 Bid commitment，250 金额完全隐藏** | amount=250 nonce=88          |
| 3   | `reveal_bid`      | `at1mdhmlauhrpaguxpl9vjspp5tyeh0xyhlzp67ag26tlsdgveufuqqvzjdsy` | 揭示出 amount=500，winner=auction 2 出价者 | auction #2 中标价            |

> 全部 tx 都已上链并 accepted，可在 `https://testnet.aleoscan.io/transaction?id=<TX_HASH>` 查询。
> `finalize_auction` 任务未要求，且 auction #2 的 reveal_window 留得较大（避免 reveal 撞窗口），所以本次未跑到 ——不影响任务完成。

---

## 5. 截图

部署 + 3 笔链上交互对应的截图放在 [`task4_project/screenshot/`](./task4_project/screenshot/)：

| 文件                 | 对应交易 | 内容                                                    | 状态 |
|----------------------|---------|---------------------------------------------------------|------|
| `deploy.png`         | §3 部署 tx | Aleoscan 上 `private_auction_nontracey.aleo` program 详情页 | ✅ |
| `create_auction.png` | §4 #1    | `create_auction` tx 在 Aleoscan 上的详情页              | ✅ |
| `submit_bid.png`     | §4 #2    | `submit_bid` tx 详情页（**重点：Inputs 字段看不到金额，只看到 record commitment**）| ✅ |
| `reveal_bid.png`     | §4 #3    | `reveal_bid` tx 详情页 + 揭示后 `auctions/2u64` 的新状态 | ✅ |

---

## 6. 部署 / 复现步骤

```powershell
# 1. 安装 Leo CLI 4.x（任选一种）
cargo install leo-lang leo-fmt leo-lsp     # 用 cargo 编译
cargo binstall leo-lang                    # 或下预编译二进制（推荐）

# 2. 配置 .env（复制模板填私钥）
cd task4_project\program
copy .env.example .env                     # 然后编辑 .env 写自己的 PRIVATE_KEY

# 3. 一键部署
..\scripts\deploy.ps1

# 4. 走完整一轮拍卖
# 参考 ..\scripts\execute_examples.md 的 6 步命令依次执行
```

---

## 7. 收获

- 第一次把 ZK 应用真正推到链上，跑通"写合约 → 编译 → 部署 → 执行"全链路。
- 体感最深的是 Aleo 的 `record` 模型 —— 在 EVM 上几乎不可能优雅实现的"密封拍卖"，在 Leo 里就是天然语义。
- **踩过的坑：**
  1. `private_auction.aleo` 这个名字在 testnet 已经被占，必须改唯一名（如 `*_nontracey.aleo`）。
  2. Leo CLI 4.x 的 `--broadcast` 是双横线，文档说的 `-broadcast` 是错的。
  3. `inclusion.prover.9fe710f` 首次拉 223 MB，下完才进 ZK prove 阶段 —— 给 testnet 测试时**先任意 execute 一次预热 prover**，免得 reveal 窗口过了还在下。
  4. priority fee 1 microcredit 就能上链，便宜 50×；只有抢跑才需要 1,000,000+。
- 测试网部署需要测试币，强烈推荐用官方 faucet：https://faucet.provable.com/
