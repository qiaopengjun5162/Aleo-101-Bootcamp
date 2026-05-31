# Task 3 - 建起来：从程序到 dApp

## 项目概述

基于 Leo 和前端完成一个可交互的隐私投票应用。

### 核心功能

- **创建隐私投票记录**：用户可以为特定提案创建加密的投票记录
- **隐私保护**：VoteRecord 中的 owner 和 vote_value 都是 private
- **可验证性**：所有操作通过零知识证明验证

## 项目结构

```
task3/
├── vote/                       # Leo 程序
│   ├── program.json            # 项目配置
│   └── src/
│       └── main.leo            # 智能合约代码
├── vote-frontend/              # 前端界面
│   └── index.html              # 交互式投票界面
└── task3.md                    # 本文档
```

## 代码说明

### Leo 程序 (vote/src/main.leo)

```leo
program privatevotedapp123.aleo {
    // Simple record for tracking votes
    record VoteRecord {
        owner: address,
        proposal_id: field,
        vote_value: bool,  // true = agree, false = disagree
    }

    @noupgrade
    constructor() {}

    // Create a new vote record
    // proposal_id is public (visible on chain), vote_value is private (kept secret)
    transition create_vote(public proposal_id: field, vote_value: bool) -> VoteRecord {
        return VoteRecord {
            owner: self.caller,
            proposal_id,
            vote_value,
        };
    }
}
```

**关键设计**：
1. **使用 `transition` 关键字**：这是创建 record 的正确入口点
2. **隐私保护**：投票者身份和投票选择完全保密
3. **公开可验证**：_nonce 公开，确保记录唯一性
4. **防止伪造**：只有 record owner 才能消费该 record
5. **零知识证明**：所有操作通过 ZKP 验证，无需暴露敏感数据

### 前端界面 (vote-frontend/index.html)

- 美观的投票界面，支持赞成/反对选择
- 模拟零知识证明生成过程
- 展示隐私投票记录结果

## 运行步骤

### 1. 编译 Leo 程序

```bash
cd vote
leo build
```

### 2. 运行测试

```bash
leo run create_vote 123456789field true
```

### 3. 启动前端

```bash
cd vote-frontend
python -m http.server 8080
```

访问 http://localhost:8080 查看交互界面

## 技术亮点

1. **隐私保护设计**
   - `owner` 和 `vote_value` 默认为 private
   - 只有投票者自己知道投了什么票
   - 外部只能验证投票记录的有效性，无法知道具体内容

2. **Aleo 特性应用**
   - 使用 `record` 存储敏感数据
   - 使用 `transition` 创建和消费记录
   - 利用零知识证明保证隐私

3. **前端交互**
   - 直观的投票界面
   - 实时展示隐私记录生成过程
   - 完整模拟 Aleo 交易流程
