# Task 2 - Leo 入门：学会这门语言 

请将本文件复制到 `learn/YourName/` 文件夹中，填写你的答案后提交 PR。
 

## 问题

**Q1. Leo 中的 "Private by Default"（默认隐私）语义是什么？**

A: 在 Leo 语言中，数据和状态默认是私有的，只有开发者显式声明为 public 时才会公开。该设计与传统区块链“默认公开”的模式相反，能够从语言层面降低隐私泄露风险，并与 Aleo 的零知识证明和 Record Model 深度结合，实现“默认隐私、按需公开”的开发范式。

---

**Q2. Tuple 包含 array structs 的示例，以及如何访问 struct 中的元素。**

A: 在 Leo 中，tuple 可以同时包含 array 和 struct，并且可以通过“逐层访问”的方式获取 struct 内部字段。

---

**Q3. Aleo record 中 owner 字段的作用是什么？**

A: owner 字段用于标识 Record 的所有者。它决定了谁拥有该 Record、谁可以解密查看其内容，以及谁有权消费该 Record 并生成新的 Record。Record 的转移本质上就是销毁旧 Record 并创建新的 Record，同时改变 owner 字段，因此 owner 是 Aleo 资产归属和访问控制的核心机制。

---

**Q4. 程序中的 final 是什么？**

A: 是“限制可变性”：可以用于变量（不可修改）、方法（不可重写）、类（不可继承），在更广义的计算语境中也表示“状态已最终确定，不再变化”。

---

**Q5. 如何创建 helper functions（辅助函数）？**

A: Helper function 是用于“拆分复杂逻辑、复用代码、提升可读性”的辅助函数，通常被主函数调用，而不直接对外暴露。

---

**Q6. helper functions 能否创建 records？**

A: 在 Leo 中，helper functions 不能直接创建或修改 record。
原因是：
- record 属于链上状态（stateful object）
- 必须通过 transition function（过渡函数） 才能创建/消费 record
- helper function 只用于纯计算逻辑（pure logic）

---

**Q7. constructor 的目的是什么？**

A: 在部署或初始化时，为 program 或 record/interface 设置初始状态或固定参数。
在 Leo 中主要用于：
- 初始化常量参数
- 设置默认配置
- 构造初始状态结构

---

**Q8. 如何组合多个 interfaces（接口）？**

A: 在 struct / record 中同时实现多个 interface 定义的字段约束。

---

**Q9. record interface 中 `..` 的含义是什么？**

A: 允许扩展字段（field extension / open-ended fields）

---

**Q10. 何时使用 dyn record（动态 record）？**

A: 当 record 类型在编译期不确定，需要在运行时动态解析或匹配时。

典型场景：
- 多种 record 类型统一处理
- 通用转账/处理逻辑
- 接口抽象层
- 插件式系统

---

**Q11. storage vector 支持的核心操作有哪些？**

A: 
1. push（添加元素）
2. pop（移除元素）
3. get（读取元素）
4. set（修改元素）
5. len（获取长度）
