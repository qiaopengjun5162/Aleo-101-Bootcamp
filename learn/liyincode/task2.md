# Task 2 - Leo 入门：学会这门语言 

请将本文件复制到 `learn/YourName/` 文件夹中，填写你的答案后提交 PR。
 

## 问题

**Q1. Leo 中的 "Private by Default"（默认隐私）语义是什么？**

A: Leo 中数据默认是私有的，除非显式加上 `public`。这意味着函数参数、record 字段等默认不会直接暴露到链上，程序通过零知识证明证明计算正确；需要公开参与链上状态或验证的数据才标记为 `public`。

---

**Q2. Tuple 包含 array structs 的示例，以及如何访问 struct 中的元素。**

A:

```leo
struct Point {
    x: u8,
    y: u8,
}

fn first_x() -> u8 {
    let points: [Point; 2] = [
        Point { x: 1u8, y: 2u8 },
        Point { x: 3u8, y: 4u8 }
    ];
    let data: ([Point; 2], u8) = (points, 9u8);
    return data.0[0u32].x;
}
```

`data.0` 访问 tuple 的第一个元素，`[0u32]` 访问数组元素，`.x` 访问 struct 字段。

---

**Q3. Aleo record 中 owner 字段的作用是什么？**

A: `owner: address` 标识 record 的拥有者，是 record 必须包含的字段。它决定这条私有状态归哪个地址所有，并用于后续消费、转移和权限判断。

---

**Q4. 程序中的 final 是什么？**

A: `final` 是链上公开执行的最终化逻辑，用来读写公共状态，例如 `mapping`、`storage` 变量和 `storage vector`。入口函数可以返回 `Final`，证明通过后网络执行 `final { ... }`；如果 final 失败，相关状态变更会回滚。

---

**Q5. 如何创建 helper functions（辅助函数）？**

A: 用普通 `fn` 声明可复用的纯计算函数，通常写在 `program` 外部，再从程序入口函数中调用。

```leo
fn fee(amount: u64) -> u64 {
    return amount / 100u64;
}
```

---

**Q6. helper functions 能否创建 records？**

A: 不能。helper functions 只能做内部计算，不能创建、消费或返回 record。record 的创建和消费属于程序入口函数的状态转换边界，应在 `program` 内的入口 `fn` 中完成。

---

**Q7. constructor 的目的是什么？**

A: `constructor` 不是传统面向对象里的对象初始化函数，而是部署和升级相关的特殊逻辑。它用于定义程序的升级策略或部署校验，例如 `@noupgrade constructor() {}` 表示程序不可升级。

---

**Q8. 如何组合多个 interfaces（接口）？**

A: 使用 `+` 组合多个接口，程序必须满足所有接口声明的函数、record、mapping 等要求。

```leo
interface Token : Transfer + Balances {}

program my_token.aleo : Transfer + Pausable {
    // implement all requirements
}
```

---

**Q9. record interface 中 `..` 的含义是什么？**

A: `..` 表示该接口只要求列出的字段必须存在，同时允许具体 record 拥有更多字段。例如接口要求 `owner` 和 `amount`，实现方仍可以添加 `symbol`、`nonce` 等额外字段。

---

**Q10. 何时使用 dyn record（动态 record）？**

A: 当程序需要通过 interface 或 dynamic call 处理具体类型在编译期未知的 record 时使用 `dyn record`。典型场景是路由器、聚合器或通用 token 接口：调用方只知道目标程序满足某个接口，但不知道它的 record 具体结构。

---

**Q11. storage vector 支持的核心操作有哪些？**

A: `storage vector` 是链上的动态数组，核心操作包括 `push` 添加元素、`len` 读取长度、`get` 读取指定下标、`set` 更新指定下标、`swap_remove` 删除指定下标。它们需要在 `final { ... }` 或 `final fn` 中执行。
