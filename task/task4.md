# Task 4 - Aleo 高级应用与合约交互

> 对应章节四：隐私 Token、合规稳定币与多合约交互

请将本文件复制到 `learn/YourName/` 文件夹中，填写你的答案后提交 PR。
 

## 问题

**Q1. 在进行隐私稳定币转账时，为什么开发者需要通过 API 获取 Merkle Tree 并构建 Merkle Proof？**

A:

---

**Q2. 如果稳定币管理员更新了冻结名单（导致 Merkle Root 改变），对正在尝试转账的用户有何影响？**

A:

---

**Q3. 在 token.leo 示例中，transfer_private 函数如何使用 input Record 并生成新的 output Record 来确保资金不被凭空创造？**

A:

---

**Q4. transfer_public_to_private 这种"半透明"转账的实际应用场景是什么？在代码中它是如何减少公共余额并创建隐私 Record 的？**

A:

---

**Q5. 为什么在 token 示例中，有些函数需要 finalize 关键字，而有些不需要？**

A:

---

**Q6. 代码风格：在 leo-examples 中，为什么推荐将"权限检查"（如 assert_eq(self.caller, admin)）放在函数的开头？**

A:

---

**Q7. 多合约交互：如果一个程序需要调用另一个已部署的程序（例如跨合约调用），在 program.json 中需要做哪些配置？**

A:

---

**Q8. 当你使用 SDK 调用 deposit 函数时，如何确保你传入的 credits Record 是"未花费（Unspent）"的？**

A:

---

**Q9. 通过 API v2，你该如何实时监控一个特定用户在虚拟钱包合约中的"公共余额"变化？**

A:
