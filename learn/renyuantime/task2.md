# Task 2 - Leo 入门：学会这门语言

请将本文件复制到 `learn/YourName/` 文件夹中，填写你的答案后提交 PR.


## 问题

**Q1. Leo 中的 "Private by Default"（默认隐私）语义是什么？**

A: 函数参数、返回值或 record 字段若未显式标注 `public`，则默认为 **private**。私有数据仅在证明者本地参与计算，不会以明文出现在链上；验证者只能看到公开输入/输出与零知识证明。需要公开的数据须显式声明 `public`。

---

**Q2. Tuple 包含 array structs 的示例，以及如何访问 struct 中的元素。**

A:

```leo
struct Point {
    x: u32,
    y: u32,
}

fn demo_tuple_with_array_structs() -> u32 {
    let points: [Point; 3] = [
        Point { x: 1u32, y: 2u32 },
        Point { x: 3u32, y: 4u32 },
        Point { x: 5u32, y: 6u32 },
    ];

    let data: ([Point; 3], u32) = (points, 100u32);

    let first_x: u32 = data.0[0u32].x;
    let second_y: u32 = data.0[1u32].y;
    let score: u32 = data.1;

    return first_x + second_y;
}
```

访问路径：**tuple 索引（`.0`、`.1`）→ 数组索引（`[i]`）→ struct 字段（`.x`、`.y`）**。

---

**Q3. Aleo record 中 owner 字段的作用是什么？**

A:

1. **标识所有权**：每个 record 必须有 `owner: address`，表示该 record 归谁所有。
2. **授权消费**：只有 owner 对应账户才能解密、消费该 record（UTXO 模型下的花费权限）。
3. **隐私与并发**：用户只操作自己的 record，不影响他人状态。
4. **语法约束**：声明 record 时 `owner` 必须是第一个字段。

---

**Q4. 程序中的 final 是什么？**

A: `final` 是 Leo/Aleo 中用于**链上公开状态更新**的延迟执行机制。入口函数在链下处理私有数据并生成证明；`final` 块在链上执行，可读写 `mapping` 等公开状态。链下 VM 无法读取链上共享状态，故需通过 `final`（或 `return final { ... }`）完成与链上状态的交互。

---

**Q5. 如何创建 helper functions（辅助函数）？**

A: 在 **`program {}` 外部**用 `fn` 声明，仅供程序内部入口函数或其他 helper 调用，外部用户不能直接调用。例如：

```leo
fn add(x: u64, y: u64) -> u64 {
    return x + y;
}

program hello.aleo {
    fn main(public a: u64, b: u64) -> u64 {
        return add(a, b);
    }
}
```

- **Entry function**：在 `program` 内声明，用户可交互的入口。
- **Helper function**：在 `program` 外声明，内部复用逻辑。

---

**Q6. helper functions 能否创建 records？**

A: **不能。** 只有 **entry functions（入口函数）** 才能创建并作为链上输出返回 records。Helper function 可做纯计算或返回 struct 等，但 record 的实际创建与输出须在入口函数中完成。

---

**Q7. constructor 的目的是什么？**

A: `constructor` 用于定义程序的**部署与升级规则**，例如：

- `@noupgrade` + `constructor() {}`：部署后不可升级；
- `@admin(address)`：仅指定管理员可升级；
- `@checksum(contract)`：通过指定合约校验升级合法性。

升级逻辑在部署前确定，constructor 本身定义的升级规则部署后不可更改；程序有 `edition` 属性，每次升级自动递增。

---

**Q8. 如何组合多个 interfaces（接口）？**

A: 在 program 名称后用 `:` 声明接口，多个接口用 **`+`** 连接：

```leo
program my_token.aleo : transfer + pausable {
    // 须同时实现 transfer 与 pausable 要求的 record 类型与函数签名
}
```

---

**Q9. record interface 中 `..` 的含义是什么？**

A: `..` 表示 interface 只约束**必须存在的字段**（如 `owner`、`balance`），实现该 interface 的 record **还可以包含额外字段**，不必与 interface 完全一致。

---

**Q10. 何时使用 dyn record（动态 record）？**

A: 当函数在编译期不绑定某一具体 record 类型，只需接收**满足某 record interface 的任意 record** 时使用，常见于：

1. 跨合约动态调用（运行时选择目标合约）；
2. 多种 record 共享相同字段形状时的通用逻辑；
3. 配合 `interface` 与 `@target` 读取外部合约链上状态。

---

**Q11. storage vector 支持的核心操作有哪些？**

A:

1. **push**：在末尾追加元素。
2. **pop**：移除并返回最后一个元素。
3. **get**：按索引读取元素。
4. **set**：按索引更新元素。
5. **len**：获取当前长度。
6. **remove**：移除指定位置的元素。

相关操作须在链上执行阶段（如 `final` 块）中完成。
