# Aleo Private Token Demo

它用 Aleo record 表示私有余额：

- `mint_private(receiver, amount)` 创建一个只属于 `receiver` 的私有 `Token` record。
- `transfer_private(sender, receiver, amount)` 消耗一个私有 `Token` record，并生成两个新 record：找零和收款。

## 本地立即运行

当前演示脚本不依赖任何 npm 包：

```bash
npm run demo
```

## 用 Leo CLI 运行真正的 Aleo 程序

本地需要 `bin/leo`。如果仓库里没有这个文件，可以从 ProvableHQ Leo release 下载适合你系统的 `leo`，放到 `bin/leo` 并赋予执行权限。

```bash
npm run leo:version
npm run leo:build
npm run leo:mint
npm run leo:transfer-demo
```

也可以手动调用：

```bash
HOME=$PWD ./bin/leo run mint_private aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px 100u64
```

这里临时设置 `HOME=$PWD` 是为了让 Leo 把本地缓存写到当前项目目录，而不是用户主目录。

## 测试网部署配置

部署前把真实 key 填到 `.env`：

```bash
ALEO_PRIVATE_KEY=你的测试网私钥
ALEO_ADDRESS=你的地址
ALEO_VIEW_KEY=你的 view key
```

`.env` 已加入 `.gitignore`，不要提交真实私钥。`.env.example` 是可提交的模板。

部署当前程序：

```bash
npm run deploy
```

## 文件

- `src/main.leo`：Aleo/Leo 隐私 record 程序。
- `scripts/demo.js`：无依赖 Node.js 演示脚本。
- `scripts/leo-transfer-demo.js`：真实调用 `bin/leo` 的 mint + transfer 演示。
- `scripts/deploy.js`：读取 `.env` 并部署到测试网，输出会过滤私钥。
- `program.json`：Leo 项目配置。
