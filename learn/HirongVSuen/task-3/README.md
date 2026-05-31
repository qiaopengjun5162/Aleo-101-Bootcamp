# 年龄是否成年验证 — 基于 Aleo 零知识证明 (ZKP)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/ProvableHQ/sdk/tree/mainnet/create-leo-app/template-react-leo)

本应用利用 Aleo 零知识证明（ZKP）技术，实现在**不暴露真实年龄**的情况下验证一个人是否已成年（≥ 18 岁）。

```
┌─────────────────────────────────────────────────┐
│              年龄是否成年验证                      │
├─────────────────────────────────────────────────┤
│  功能介绍：ZKP 技术在不泄露年龄的前提下验证是否成年   │
├─────────────────────────────────────────────────┤
│  ZKP 证明值：✅ 已成年  /  🔞 未成年               │
├────────────────────┬────────────────────────────┤
│  🔑 输入者          │  🔍 验证者                   │
│  输入年龄 → 生成证明  │  验证证明 → 证明有效/无效      │
└────────────────────┴────────────────────────────┘
```

## 工作原理

### Leo 程序 (`age_verify/src/main.leo`)

```leo
program age_verify.aleo {
    fn verify_age(age: u8, threshold: u8) -> bool {
        return age >= threshold;
    }
}
```

- `age` — **私密输入**（private），验证者永远无法看到真实年龄
- `threshold` — **公开输入**（public），固定为 18
- 输出 — 布尔值，表示是否成年

### 零知识证明流程

| 步骤 | 角色 | 操作 | SDK 方法 |
|------|------|------|----------|
| 1. 生成证明 | 输入者 | 输入年龄，生成 ZKP 证明 | `programManager.run(..., true)` — `proveExecution: true` |
| 2. 查看结果 | 任何人 | 查看 ZKP 证明值（成年/未成年） | `executionResponse.getOutputs()` |
| 3. 验证证明 | 验证者 | 验证证明真实有效、未被篡改 | `programManager.verifyExecution(executionResponse, blockHeight)` |

## 项目结构

```
aleo-project/
├── age_verify/                  # 年龄验证 Leo 程序
│   ├── src/main.leo             # Leo 源码
│   ├── build/main.aleo          # 编译后的 ALEO 指令（前端加载）
│   └── program.json             # 程序元数据
├── helloworld/                  # 原始 HelloWorld 示例程序
├── src/
│   ├── App.jsx                  # React 主界面（三段式布局）
│   ├── App.css                  # 样式
│   ├── main.jsx                 # 入口
│   └── workers/
│       ├── AleoWorker.js        # Worker 单例封装
│       └── worker.js            # SDK 调用：proveExecution + verifyExecution
├── index.html
├── package.json
└── vite.config.js
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

浏览器打开 http://localhost:5173/

### 3. 使用

1. 在左侧"输入者"区域输入年龄（0-255）
2. 点击**生成证明**，等待 ZKP 证明生成
3. 上方"ZKP 证明值"区域显示结果：✅ 已成年 或 🔞 未成年
4. 右侧"验证者"区域点击**验证证明**，验证证明有效性

## 开发

### 修改 Leo 程序

1. 编辑 `age_verify/src/main.leo`
2. 使用 Leo 编译器编译：
   ```bash
   cd age_verify
   leo build
   ```
3. 编译后的 `build/main.aleo` 会被前端自动加载

> **注意**：如果 `leo build` 不可用，也可以直接编辑 `age_verify/build/main.aleo` 文件（ALEO 指令格式）。

### 构建生产版本

```bash
npm run build
```

将 `dist` 目录部署到你的 Web 服务器。

### ⚠️ 部署注意事项

部署时需要确保服务器配置以下 HTTP 响应头：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

项目已包含 `_headers` 文件，适用于 Netlify 等平台。其他服务器需手动配置。

## 技术栈

- **React 19** — 前端框架
- **Vite** — 构建工具
- **@provablehq/sdk** — Aleo SDK（proof generation + verification）
- **Leo** — Aleo 智能合约语言
- **Comlink** — Web Worker 通信封装

## 许可证

MIT
