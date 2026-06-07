# Task 4 - 用起来：真实场景落地

## 任务要求

将 Aleo 应用部署到测试网并完成一次链上交互，提交相关代码、测试网合约地址和链上交互截图。

## 应用名称

Private Vote 隐私投票

## 代码位置

```text
learn/01luyicheng/task4/vote/
```

## 本地验证状态

已完成本地 Leo 编译和交互验证。

本地环境：

```text
leo 3.5.0
```

本地执行命令：

```bash
cd learn/01luyicheng/task4/vote
leo run create_vote 123456789field true
```

本地输出摘要：

```text
Compiled 'privatevotedapp123.aleo' into Aleo instructions.
Generated ABI at 'build/abi.json'.

owner: aleo13zjkkxfv9j32vpptr8l7cquwj5rfzzpffs4ulrgpsr0xtjhcmqysw9ee3h.private
proposal_id: 123456789field.private
vote_value: true.private
```

## 测试网部署命令

真实部署时需要使用本地钱包私钥签名，并确保账户中有测试网 credits。

不要把私钥写进仓库。建议在本地 PowerShell 临时设置环境变量：

```powershell
# 只在当前终端会话中设置私钥，不提交到 Git。
$env:PRIVATE_KEY = "APrivateKey..."

cd learn/01luyicheng/task4/vote
leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast
```

部署成功后，再执行一次链上交互：

```powershell
leo execute create_vote 123456789field true --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast
```

## 当前测试网部署状态

当前未声称已完成真实测试网部署。

原因：

- 本地已经安装并验证 `leo 3.5.0`，Leo 程序可以编译和本地运行。
- 真实测试网部署必须使用可签名账户私钥和测试网 credits。
- 私钥、助记词、View Key 不能写入仓库，也不应该在聊天中发送。

## 测试网合约地址

```text
待使用本地钱包私钥和测试网 credits 广播部署后填写。
```

## 链上交互截图

```text
待真实部署和 execute 广播成功后补充。
```
