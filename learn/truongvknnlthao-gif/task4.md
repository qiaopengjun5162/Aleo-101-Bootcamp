# Task 4 - 用起来：真实场景落地

将 Task 3 的 `Private Allocation Proof` 隐私小应用部署到 Aleo Testnet，并完成一次链上交互。

课程视频演示了 USDCX 隐私转账；本提交选择将 Task 3 自建 Leo 应用部署到测试网，并以 `create_allocation` 作为链上交互，满足官方 Task 4 对“部署你的 Aleo 应用并完成一次链上交互”的要求。

## 部署信息

- 程序名称：`private_allocation_demo.aleo`
- 测试网合约 / Program ID：`private_allocation_demo.aleo`
- 网络：Aleo Testnet
- 部署者地址：`aleo1jhppczfdz0lpgfg5ga6vmj68t57th9cl3ydxnkgw2h5wt58rks8smkzlpv`（专用开发测试钱包）
- 部署交易 ID：`at12hvg3wcnmjcntpm45j76g2jm5prqkwvcv6lmjwxxgp69mec3cvgsfezugs`
- Fee ID：`au1cgvaksxkrfm0q8u95g0fhrrey8vd4c89g94t4d2jlpen72lxssxqs324le`
- Fee 交易 ID：`at176898v0jfwj53p6yj5s0axqj26uxwvzhgpa8cknjca3qj7jr7uyq9r9764`
- 部署费用：`3.900148 credits`
- 部署状态：✅ Transaction accepted and confirmed
- 部署 Explorer：https://testnet.explorer.provable.com/transaction/at12hvg3wcnmjcntpm45j76g2jm5prqkwvcv6lmjwxxgp69mec3cvgsfezugs

## 链上交互

### 调用 `create_allocation`

本次执行把 10 点资源私下分配到 Scout / Shield / Research，并生成一个 `Allocation` private record。

输入：

```text
owner    = aleo1jhppczfdz0lpgfg5ga6vmj68t57th9cl3ydxnkgw2h5wt58rks8smkzlpv
scout    = 4u8
shield   = 3u8
research = 3u8
```

执行交易 ID：

```text
at1fa43ysngs90l27w0fdg4tmlhlx45sg85x5230t0ew34sa3zg5v8syvdw3w
```

Fee ID：

```text
au1dv48u6x5zanuv5cyplk80qss9y5uf7ye7y2na7s938gref4xfqpq7jtdwc
```

Fee 交易 ID：

```text
at1mdh2tqqj0c3jlqweu38dn625qm54e96pmg5sauslqqjhym3dhsgsuet2qe
```

执行费用：

```text
0.001743 credits
```

执行状态：✅ Transaction accepted and confirmed

执行 Explorer：

```text
https://testnet.explorer.provable.com/transaction/at1fa43ysngs90l27w0fdg4tmlhlx45sg85x5230t0ew34sa3zg5v8syvdw3w
```

输出结果：

```text
Allocation {
  owner: aleo1jhppczfdz0lpgfg5ga6vmj68t57th9cl3ydxnkgw2h5wt58rks8smkzlpv.private,
  scout: 4u8.private,
  shield: 3u8.private,
  research: 3u8.private,
  _nonce: 5035673926852230037966147766596509222179103070895150067043982921198084546122group.public,
  _version: 1u8.public
}
```

## 余额变化

部署前余额：

```text
20 credits
```

部署后、执行前余额：

```text
16.099852 credits
```

执行后余额：

```text
16.098109 credits
```

## 代码文件

本次部署使用 Task 3 的 Leo 程序：

```text
learn/truongvknnlthao-gif/task3/private_allocation_demo/src/main.leo
learn/truongvknnlthao-gif/task3/private_allocation_demo/program.json
```

完整 Task 3 demo 文件位于：

```text
learn/truongvknnlthao-gif/task3/
```

## 部署与执行日志

Redacted logs：

```text
learn/truongvknnlthao-gif/task4/logs/deploy-redacted.txt
learn/truongvknnlthao-gif/task4/logs/execute-redacted.txt
```

## 截图

终端截图是基于 redacted logs 生成的 terminal-output screenshots；Explorer 截图是真实 Testnet Explorer 页面截图。

截图目录：

```text
learn/truongvknnlthao-gif/task4/screenshots/
```

已补充：

```text
deploy-terminal.png
deploy-explorer.png
execute-terminal.png
execute-explorer.png
```

## 安全说明

- 未提交 private key、view key、seed phrase、API key 或任何钱包敏感信息。
- 部署和执行日志已 redacted。
- 本次使用专用开发测试钱包，不混用 GitHub profile 中登记的钱包。
