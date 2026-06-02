# ZK 私密资质通行证（ZK Private Credential Pass）

一个「证明达标、但不暴露真实数值、且无需信任平台方」的隐私验证 dApp，基于 Aleo / Leo。

> 完整 PRD + 技术设计见 [`task3.md`](./task3.md)。本 README 只讲**怎么跑起来**。

## 这是什么

某平台要求「信用分 ≥ 700」才放行。用户想证明自己达标，却**不想把真实分数（如 820）告诉平台**。
本应用让持证人**只证明「≥700 为真」**，平台拿不到任何具体数值，也无需信任任何第三方。

三方角色一屏闭环：
- **Issuer 发证方**：签发私密凭证（真实分数进入私有 `record`，明文不上链）。
- **Holder 持证人**：用凭证生成「达标」零知识证明（证明里不含真实数值）。
- **Verifier 验证方**：只看到「通过 / 未通过」与公开计数，**永远看不到真实分数**。

## 目录结构

```text
task3/
├── task3.md             # PRD + 技术设计（事实来源）
├── README.md            # 本文件
├── credential_pass/     # Leo 程序（record + mapping + final）
│   ├── program.json
│   └── src/main.leo
├── backend/
│   ├── server.js        # Node + Express，真实调用 leo run
│   └── package.json
├── web/
│   └── index.html       # 单页三面板前端（原生 HTML/CSS/JS，shadcn 黑白风格）
└── screenshots/         # demo 截图
```

## 环境要求

- macOS（Apple Silicon 或 Intel）/ Linux
- **Leo 4.x**（本项目用 4.1.0；语法用 `fn` + `final {}`）
- **Node** v18+（本项目用 v22/v24）

## 安装 Leo CLI

```bash
# 方式一：cargo（需先装 Rust：curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh）
cargo install leo-lang

# 方式二：直接下载预编译二进制（Apple Silicon）
#   https://github.com/ProvableHQ/leo/releases
#   → leo-lang-v4.1.0-aarch64-apple-darwin.zip，解压后放进 PATH（如 ~/.local/bin）

leo --version    # 期望 leo 4.1.0
```

## 启动流程（三步）

> 建议开 **3 个终端**。所有命令在 `learn/renyuantime/task3/` 下执行。

### 1) Leo 程序（首次需创建本机账户）

```bash
cd credential_pass
leo account new --seed 1 --write     # 写入 .env，决定 self.signer
```

可选：先在命令行验证三种用例都正确（达标 / 未达标 / 非本人）：

```bash
SELF=aleo1r8a69q9z0v67t2w4ut4zamavyr09qr43vk7f584q6wpymg5qvg8scmerq8

# 达标：返回 record；再用 record 验证 700 → true + final 计数 +1
leo run issue_credential $SELF 820u32
leo run verify_threshold "<上一步的 record>" 700u32

# B1 未达标：用 650 的 record 验证 700 → assert 失败
# B2 非本人：把凭证签发给别的地址，再用本机签名验证 → 执行期拒绝
```

### 2) 后端（真实调用 leo run，端口 3001）

```bash
cd backend
npm install
node server.js
```

接口：`GET /health`、`POST /api/issue`、`POST /api/verify`，统一返回 `{ ok, stdout, result, stderr }`。

### 3) 前端（静态页，端口 8080）

```bash
cd web
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

在页面上按 ①发证 → ②出证 → ③验证 的顺序操作即可看到完整闭环。
面板①的「用他人地址（演示非本人）」按钮可一键演示 B2 分支。

## 真实执行说明（重要）

- 所有计算结果**均来自 `leo run` 的真实输出**，前端/后端不做任何 JS 业务计算。
- `verify_threshold` 内含 `assert_eq(self.signer, cred.owner)`（防盗用）与 `assert(score >= threshold)`（达标判定），并在 `final {}` 中更新公开计数与防重放标记 `used[nullifier]`。
- **本次范围为 L1（本地真实执行）**。部署上链（`leo deploy` / `execute --broadcast`）、公共测试网、防重放的 live 持久化演示属于 Task 4：Leo 代码里逻辑已写好、可部署，但本次不要求跑通。`leo run` 下公开 mapping 不跨调用持久化，因此「第二次被拒」无法 live 复现。

## 演示截图

见 [`screenshots/`](./screenshots/)：签发、达标通过、未达标、非本人四个场景。
