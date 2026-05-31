# 🗳️ Aleo ZK Vote

基于 [Aleo](https://aleo.org) 零知识证明的隐私投票 DApp。投票内容（投了谁、投了什么）全程加密上链，只有投票者本人可见。

## 项目简介

本项目是 Aleo 101 Bootcamp Task 3 的实现，包含：

- **Leo 智能合约** — `zkvoteapp/src/main.leo`，定义了投票记录（`VoteRecord`）和创建投票的入口函数（`create_vote`）
- **React 前端** — `src/Vote.tsx`，提供投票交互界面，通过 Web Worker 调用 Aleo SDK 本地生成零知识证明

### 核心特性

| 特性 | 说明 |
|---|---|
| 🔒 投票隐私 | `proposal_id` 和 `vote_value` 均为 `.private`，链上加密存储 |
| 🛡️ 零知识证明 | 前端本地生成 ZK proof，不泄露任何投票内容 |
| 📝 Vote Record | 投票结果以 Aleo Record 形式返回，归属于投票者地址 |

## 项目结构

```
task3-aleo-vote/
├── zkvoteapp/                  # Leo 智能合约
│   ├── src/main.leo            # 合约源码
│   ├── build/main.aleo         # 编译产物（Aleo 字节码）
│   └── build/abi.json          # 合约 ABI
├── helloworld/                 # Aleo 示例程序（模板自带）
├── src/
│   ├── Vote.tsx                # 投票页面组件
│   ├── Vote.css                # 投票页面样式
│   ├── App.tsx                 # 原始模板页面
│   ├── main.tsx                # 入口文件
│   └── workers/
│       ├── AleoWorker.ts       # Comlink Worker 封装
│       └── worker.ts           # Aleo SDK 调用（Web Worker）
├── package.json
└── vite.config.ts
```

## Leo 合约

```leo
program zkvoteapp.aleo {
    record VoteRecord {
        owner: address,
        proposal_id: field,
        vote_value: bool,  // true = agree, false = disagree
    }

    fn create_vote(public proposal_id: field, public vote_value: bool) -> VoteRecord {
        return VoteRecord {
            owner: self.signer,
            proposal_id,
            vote_value,
        };
    }
}
```

**输入参数：**

| 参数 | 类型 | 可见性 | 说明 |
|---|---|---|---|
| `proposal_id` | `field` | public | 提案编号 |
| `vote_value` | `bool` | public | 投票选择（agree/disagree） |

**返回值：** `VoteRecord`（所有字段均为 `.private`）

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Leo](https://github.com/ProvableHQ/leo) >= 4.0（编译合约用）

### 安装 & 运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173/ ，在 **🗳️ ZK Vote** 区域输入 Proposal ID 并选择投票选项，点击 "Create Vote" 即可生成零知识投票记录。

### 编译 Leo 合约

```bash
cd zkvoteapp
leo build
```

编译产物输出到 `zkvoteapp/build/main.aleo`，前端通过 `?raw` 导入直接加载。

## 技术栈

- **Aleo** — L1 隐私区块链
- **Leo** — Aleo 智能合约语言（编译为零知识电路）
- **@provablehq/sdk** — Aleo JS SDK（WASM，Web Worker 中运行）
- **React + TypeScript** — 前端框架
- **Vite** — 构建工具
- **Comlink** — Web Worker 通信封装

## 参考

- [Aleo 官方文档](https://developer.aleo.org/)
- [Leo 语言文档](https://leo-lang.org/)
- [Provable SDK](https://github.com/ProvableHQ/sdk)
