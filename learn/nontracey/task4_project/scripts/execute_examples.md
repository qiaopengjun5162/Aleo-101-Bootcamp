# 链上交互示例命令（Leo CLI 4.x）

> 部署完成后，按顺序执行下列命令即可走完一轮完整的拍卖（创建 → 出价 → 揭示 → 最终化）。
> 把示例中的 `APrivateKey1zkp...` 替换成自己的测试网私钥。
> **所有命令在 `task4_project/program` 目录下执行**。

## 公共 `.env` 配置（强烈推荐）

在 `program/` 目录下先放一份 `.env`，每个角色（卖家/出价者）只换 PRIVATE_KEY 即可：

```env
NETWORK=testnet
ENDPOINT=https://api.explorer.provable.com/v1
PRIVATE_KEY=APrivateKey1zkp_xxxx
```

> Leo CLI 会自动读取 `.env`，所以下面的命令里不再写 `--network` / `--endpoint`。

---

## 1. 卖家：创建拍卖（公开）

参数：`auction_id=1` ，物品 ID `42` ，起拍价 `100` μcredits ，
出价持续 `30` 个区块 ，揭示窗口 `30` 个区块。

```bash
# 把 .env 切到 卖家 私钥
leo execute create_auction \
    1u64 42u64 100u64 30u32 30u32 \
    --priority-fees 100000 \
    --broadcast \
    --json-output \
    -y
```

---

## 2. 出价者 A：隐私出价 250（链上完全看不到 250）

```bash
# 把 .env 切到 出价者 A 私钥
leo execute submit_bid \
    1u64 250u64 88u64 \
    --priority-fees 100000 \
    --broadcast \
    --json-output \
    -y
```

> 输出中会包含一条 `Bid` record 的 plaintext，请保存好，揭示阶段要原样作为输入传回。

## 3. 出价者 B：隐私出价 500

```bash
# 把 .env 切到 出价者 B 私钥
leo execute submit_bid \
    1u64 500u64 99u64 \
    --priority-fees 100000 \
    --broadcast \
    --json-output \
    -y
```

---

## 4. 等待出价窗口结束（≥30 块）后进入揭示阶段

出价者 A 揭示：
```bash
# .env 切回 出价者 A
leo execute reveal_bid \
  "{ owner: aleo1xxxx.private, auction_id: 1u64.private, amount: 250u64.private, nonce: 88u64.private, _nonce: 8...group.public }" \
  1u64 250u64 \
  --priority-fees 100000 \
  --broadcast \
  --json-output \
  -y
```

出价者 B 揭示：
```bash
# .env 切回 出价者 B
leo execute reveal_bid \
  "{ owner: aleo1yyyy.private, auction_id: 1u64.private, amount: 500u64.private, nonce: 99u64.private, _nonce: 5...group.public }" \
  1u64 500u64 \
  --priority-fees 100000 \
  --broadcast \
  --json-output \
  -y
```

---

## 5. 揭示窗口结束（再过 30 块）后任何人最终化

```bash
leo execute finalize_auction \
    1u64 \
    --priority-fees 100000 \
    --broadcast \
    --json-output \
    -y
```

---

## 6. 查询链上 mapping 当前结果

```bash
leo query program private_auction_nontracey.aleo --mapping auctions --key 1u64
```

或直接 HTTP：

```bash
curl "https://api.explorer.provable.com/v1/testnet/program/private_auction_nontracey.aleo/mapping/auctions/1u64"
```

返回 JSON 即 `AuctionInfo`，含 `winner` + `highest_bid` + `finalized: true`。

---

## 7. 每一步的 tx_id 在哪？

每条 `leo execute ... --json-output` 会写到 `build/json-outputs/execute.json`，里面有 `transaction_id`。
直接拼到 Aleoscan 即可看链上详情：

```
https://testnet.aleoscan.io/transaction?id=<tx_id>
```
