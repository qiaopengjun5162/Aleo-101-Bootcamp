## Q1. Leo 中的 "Private by Default"（默认隐私）语义是什么？

A:
 Leo 中的数据默认是私有的，除非显式声明为 `public`，否则状态和输入不会公开到链上。

------

## Q2. Tuple 包含 array structs 的示例，以及如何访问 struct 中的元素。

A:
 Tuple 可以包含数组和 struct，例如：

```
let data = ([1u8, 2u8], User { age: 18u8 });
```

访问 struct 元素：

```
data.1.age
```

------

## Q3. Aleo record 中 owner 字段的作用是什么？

A:
 `owner` 用于指定 record 的拥有者，只有 owner 才能花费或使用该 record。

------

## Q4. 程序中的 final 是什么？

A:
 `final` 是 transition 执行后的公开状态更新逻辑，用于修改 mapping 等链上状态。

------

## Q5. 如何创建 helper functions（辅助函数）？

A:
 使用 `function` 定义普通函数，并在 transition 中调用即可。

------

## Q6. helper functions 能否创建 records？

A:
 不能。只有 transition 才能创建和返回 records。

------

## Q7. constructor 的目的是什么？

A:
 constructor 用于程序初始化，在部署时设置初始状态。

------

## Q8. 如何组合多个 interfaces（接口）？

A:
 可以通过在 interface 中引用其他 interface 进行组合复用。

------

## Q9. record interface 中 `..` 的含义是什么？

A:
 `..` 表示允许 record 包含未显式声明的额外字段。

------

## Q10. 何时使用 dyn record（动态 record）？

A:
 当 record 字段结构不固定，需要动态扩展字段时使用 dyn record。

------

## Q11. storage vector 支持的核心操作有哪些？

A:
 常见操作包括：

- `push`
- `pop`
- `get`
- `set`
- `remove`
- `len`