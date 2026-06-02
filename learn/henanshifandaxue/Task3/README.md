# Aleo 隐私投票 dApp

> 基于 Leo 编程语言和 Aleo 区块链构建的零知识证明隐私投票系统

## 📋 项目介绍

这是一个完整的去中心化隐私投票应用（dApp），利用 Aleo 区块链的零知识证明技术和 Leo 编程语言实现。系统确保投票过程完全匿名，投票结果公开可验证。

### 核心特性

- **🔐 零知识证明**：使用 ZK-SNARKs 技术保护投票者隐私
- **🎭 完全匿名**：投票者身份不会暴露在链上
- **✅ 可验证**：投票结果公开透明，任何人都可验证
- **⛓️ 去中心化**：运行在 Aleo 区块链上，无单点故障
- **💻 友好界面**：现代化 Web 界面，操作简单直观

## 🏗️ 技术架构

### 智能合约层 (Leo)
- **编程语言**：Leo 1.0+
- **运行环境**：Aleo Blockchain / snarkVM
- **核心功能**：
  - `propose` - 创建新提案（公开）
  - `new_ticket` - 生成私密投票凭证
  - `agree` - 投赞成票（私密）
  - `disagree` - 投反对票（私密）
  - `get_results` - 获取公开投票结果

### 前端层
- **技术栈**：HTML5 + CSS3 + Vanilla JavaScript
- **UI 框架**：自定义响应式设计
- **交互方式**：模拟 Aleo 网络调用（可接入真实 SDK）

## 📁 项目结构

```
privacy_voting/
├── leo/                          # Leo 智能合约项目
│   ├── src/
│   │   └── main.leo             # 投票合约源代码
│   └── project.json             # Leo 项目配置
├── frontend/                     # 前端应用
│   ├── index.html               # 主页面
│   ├── styles.css               # 样式文件
│   └── app.js                   # 交互逻辑
├── demo_screenshot.png          # 运行截图
└── README.md                    # 项目说明文档
```

## 🚀 快速开始

### 前置要求

1. **安装 Leo CLI**
```bash
# 安装 Leo 编程语言
cargo install leo --locked
```

2. **验证安装**
```bash
leo --version
```

### 编译 Leo 合约

```bash
cd leo

# 编译合约
leo build

# 运行测试（如有）
leo test
```

### 部署到 Aleo 网络

```bash
# 部署到测试网
leo deploy --network testnet

# 执行函数示例
leo run propose "{
  title: 12345field,
  content: 67890field,
  proposer: aleo1xxx...,
  timestamp: 1234567890u64
}"
```

### 运行前端应用

前端无需构建工具，直接在浏览器中打开即可：

```bash
cd frontend
open index.html
```

或者使用本地 HTTP 服务器：
```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## ⚙️ Leo 合约详解

### 数据结构

#### `Proposal` 记录
```leo
record Proposal {
    owner: address,      // 提案所有者
    id: field,           // 唯一提案ID
    info: ProposalInfo,  // 提案元数据
}
```

#### `Ticket` 记录（私密）
```leo
record Ticket {
    owner: address,      // 投票者地址（私密）
    pid: field,          // 关联提案ID
    used: bool,          // 是否已使用
}
```

### 公开映射（On-Chain State）

- `proposals` - 提案ID → 提案信息
- `agree_votes` - 提案ID → 赞成票数
- `disagree_votes` - 提案ID → 反对票数
- `used_tickets` - 凭证ID → 使用状态（防止重复投票）

### 核心函数说明

#### `propose` - 创建提案
- **访问**：公开
- **功能**：任何人都可创建新提案
- **状态**：提案信息公开存储在链上

#### `new_ticket` - 生成投票凭证
- **访问**：公开调用，返回私密记录
- **功能**：为合格投票者生成投票凭证
- **隐私**：Ticket 记录仅所有者可见

#### `agree` / `disagree` - 投票
- **访问**：私密（需提供 Ticket 记录）
- **功能**：使用私密凭证进行投票
- **隐私**：投票者身份完全隐藏，仅零知识证明被验证
- **结果**：投票计数公开更新，投票者匿名

## 🎨 前端功能

### 1. 创建提案
- 填写提案标题和内容
- 自动生成唯一提案 ID
- 模拟 Leo 合约调用和 ZK 证明生成

### 2. 匿名投票
- 选择要投票的提案
- 自动生成私密投票凭证
- 投赞成/反对票
- 零知识证明验证

### 3. 结果展示
- 实时投票统计
- 可视化进度条
- 总投票数显示
- 提案列表管理

### 4. 交易日志
- 完整的操作记录
- Leo 函数调用追踪
- ZK 证明生成日志

## 🔒 隐私保护机制

### 零知识证明工作流程

1. **凭证生成**：投票者获得私密 `Ticket` 记录
2. **本地证明**：投票在本地生成 ZK 证明
3. **链上验证**：仅提交证明，不暴露投票者身份
4. **状态更新**：公开投票计数，投票者保持匿名

### 隐私保障

- ✅ 投票者身份永远不会公开
- ✅ 谁投了什么票无法被追踪
- ✅ 每张票只能使用一次（防双投）
- ✅ 投票结果数学上可验证

## 🌐 与 Aleo 网络集成

当前版本包含完整的交互模拟，要连接到真实 Aleo 网络：

1. 安装 Aleo SDK
2. 替换 `app.js` 中的模拟函数
3. 使用真实的钱包连接（如 Leo Wallet）
4. 部署合约到 Aleo 测试网/主网

```javascript
// 示例：使用 Aleo SDK 进行真实调用
import { AleoSDK } from '@aleohq/sdk';

const aleo = new AleoSDK({ network: 'testnet' });
const result = await aleo.execute('privacy_voting.aleo', 'agree', [ticket]);
```

### 核心流程演示

1. **创建提案**
   - 用户填写提案信息
   - 系统生成 ZK 证明
   - 提案上链存储

2. **获取投票权**
   - 系统为合格用户生成私密 Ticket
   - Ticket 仅用户可见

3. **私密投票**
   - 用户使用 Ticket 投票
   - 本地生成 ZK 证明
   - 证明提交链上验证

4. **结果统计**
   - 投票计数公开更新
   - 投票者身份保持私密
   - 任何人可验证结果

## 🧪 测试说明

### Leo 合约测试

```bash
cd leo

# 编译检查
leo build

# 运行函数测试
leo run propose "{
  title: 100field,
  content: 200field,
  proposer: aleo1rfez44epy0m7nv4pskvjy6vex64tnt0xy90fyhrg49cwe0t9ws8sh6nhhr,
  timestamp: 1717000000u64
}"
```

### 前端测试

直接在浏览器中打开 `frontend/index.html`，测试：
- 创建提案功能
- 投票功能
- 结果实时更新
- 响应式布局
不完整应用，可以运行，但是功能单一
