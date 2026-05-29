# Aleo 101 Bootcamp 学习与开发记录总结

**作者**: Yao990x16

参加 Aleo 101 Bootcamp 是一次非常充实的零知识证明（ZK）应用开发之旅。通过四个阶段的逐步深入，我不仅理解了 Aleo 保护隐私的理论基础，还实际动手完成了从智能合约编写到前端 dApp 搭建，再到测试网部署的全流程。

以下是本次训练营核心学习过程的总结，重点回顾了 Task 3 和 Task 4 的开发与部署实践。

---

## 理论基础巩固 (Task 1 & Task 2)

在前两个任务中，我主要学习了 Aleo 的核心理念和 Leo 语言的语法：
- **隐私优先**：理解了传统去中心化账本在隐私和扩展性上的痛点，以及 Aleo 采用的 Record 模型如何通过零知识证明（zk-SNARKs）实现“默认隐私”（Private by Default）。
- **Leo 语言特性**：掌握了 Leo 中的基础类型、Tuple、数组、Struct 以及 Record 的 `owner` 机制。学习了 `transition`（链下执行生成证明）与 `final`（链上公开状态更新）的区别和联系。

---

## 实践一：从零搭建隐私 dApp (Task 3)

**目标**：基于 Leo 和前端框架完成一个可交互的隐私小应用。
**项目**：零知识年龄验证器（ZK Age Verifier）

在 Web2 中，证明年龄往往需要暴露完整的出生日期或身份证件，存在严重的隐私泄露风险。基于这个痛点，我设计了一个年龄验证 dApp。

**核心开发步骤**：
1. **智能合约开发**：
   编写了 `main.leo`，核心逻辑为 `fn verify_age(private age: u8, public age_limit: u8) -> bool`。通过 `private` 关键字隐蔽用户的真实年龄，只对比并返回是否达标的布尔值。
2. **前端集成**：
   使用 `create-aleo-app` 脚手架搭建了 React 前端，并集成了 `@aleohq/sdk`。
3. **本地 ZK 证明生成**：
   在浏览器端，利用 WebAssembly (WASM) 在本地环境生成零知识证明计算。用户的真实年龄数据完全不需要离开本地设备，真正做到了数据可用不可见。
4. **UI 设计**：
   设计了暗黑玻璃态（Glassmorphism）UI，提升了用户的交互体验。

---

## 实践二：测试网部署与链上真实交互 (Task 4)

**目标**：将应用部署到 Aleo 测试网（Testnet），并完成真实的链上交互与钱包适配。
**项目升级**：ZK Age Verifier (Testnet 部署版)

在这个阶段，我将纯本地的 dApp 升级为了能够真正与 Aleo 网络交互的去中心化应用，并解决了诸多工程化问题。

**核心开发与部署步骤**：
1. **SDK 升级与钱包接入**：
   - 将原有的 `@aleohq/sdk` 升级至最新版的 `@provablehq/sdk@0.10.5`。
   - 在前端创建了 `WalletProvider.jsx`，成功接入了 **Shield Wallet** 和 **Leo Wallet**。
2. **测试网部署 (`leo deploy`)**：
   - 准备了拥有测试网 Credits 的账户，配置好 `.env`（设置 `NETWORK=testnet` 等参数）。
   - 将程序重命名为 `yao990x16_age_verifier.aleo`。
   - 执行 `leo deploy --yes --broadcast` 成功将合约部署至 Aleo Testnet。
3. **链上交互执行 (`leo execute`)**：
   - 使用 CLI 执行了 `leo execute verify_age 25u8 18u8 --yes --broadcast`。
   - 链上成功验证并输出了 `true`，消耗了极低的执行费用。
4. **前端工程化问题攻克**：
   - 在构建前端 Web Worker 时，遇到了 `@provablehq/wasm` 导致打包失败的问题（`Top-level await is not available...`）。
   - **解决方案**：深入调整了 Vite 的配置（`vite.config.js`），设置 `worker: { format: 'es' }` 以及 `build: { target: 'esnext' }`，完美解决了 ESM 格式和 Top-level await 的兼容性问题。同时修复了 ESLint 报错，确保了代码规范。
5. **单元测试重构**：
   - 配合新的程序名称，重构了 `test_yao990x16_age_verifier.leo` 单元测试文件，并成功跑通所有测试用例（4/4 passed）。

---

## 总结与感悟

通过 Aleo 101 Bootcamp，我深刻体会到了零知识证明技术的魅力。Aleo 提供的开发工具链（Leo 编译器、Provable SDK）极大地降低了 ZK 应用的开发门槛。

从 Task 3 的本地证明生成，到 Task 4 的测试网实际上链，我不仅掌握了 Leo 智能合约的编写，还学会了如何解决前端 WASM 集成、钱包适配等实际工程问题。这是一次非常棒的技术探索体验，期待未来能在 Aleo 生态中开发出更多有价值的隐私保护应用！
