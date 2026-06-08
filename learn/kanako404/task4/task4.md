# Task 4 - 用起来：真实场景落地 

将Aleo 应用部署到测试网并完成一次链上交互，提交相关代码，测试网合约地址和链上交互截图。

## 测试网合约地址:fitness_rpg_6576.aleo 
Explorer 查看链接：https://testnet.explorer.provable.com/program/fitness_rpg_6576.aleo
<img width="2288" height="1767" alt="image" src="https://github.com/user-attachments/assets/1cdd9d8d-2b31-479a-8616-0b31a476e449" />

## 链上交互
部署交易 https://testnet.explorer.provable.com/transaction/at1j9qhxu4mgrr2v5uk9x53v6pzr7fr3s4tvsjsksk8nkpywud8gsgqtqn2s8
<img width="2382" height="1794" alt="image" src="https://github.com/user-attachments/assets/5c041329-0563-4074-bdf0-8999e54f8d80" />

执行交易 https://testnet.explorer.provable.com/transaction/at14xfnxwkhmskz3c8xk8stvg0pty68nqg9q7uz9rdxwvr78u7sfggq645fpd
<img width="2374" height="699" alt="image" src="https://github.com/user-attachments/assets/992bdf39-0dc8-465a-bf6f-b779fc7e414f" />

---

## 测试网部署与链上交互 — 完成报告

### 合约信息

| 项目 | 值 |
|------|------|
| **程序 ID（合约地址）** | `fitness_rpg_6576.aleo` |
| **网络** | Aleo Testnet (Consensus V15) |
| **程序大小** | 1.67 KB / 500 KB |
| **ZK 电路复杂度** | 24,862 variables / 18,241 constraints |

### 部署交易 (Deploy)

| 项目 | 值 |
|------|------|
| **交易 ID** | `at1j9qhxu4mgrr2v5uk9x53v6pzr7fr3s4tvsjsksk8nkpywud8gsgqtqn2s8` |
| **状态** | ✅ Confirmed |
| **费用** | 2.639103 credits |
| **Explorer** | [查看交易](https://explorer.provable.com/transaction/at1j9qhxu4mgrr2v5uk9x53v6pzr7fr3s4tvsjsksk8nkpywud8gsgqtqn2s8) |

### 链上交互交易 (Execute)

| 项目 | 值 |
|------|------|
| **交易 ID** | `at14xfnxwkhmskz3c8xk8stvg0pty68nqg9q7uz9rdxwvr78u7sfggq645fpd` |
| **状态** | ✅ Confirmed |
| **调用函数** | `compute_fitness(175u32, 70u32, 1995u32, 1u8, 2026u32)` |
| **费用** | 0.001638 credits |
| **Explorer** | [查看交易](https://explorer.provable.com/transaction/at14xfnxwkhmskz3c8xk8stvg0pty68nqg9q7uz9rdxwvr78u7sfggq645fpd) |

### 链上执行输出（ZK 证明保护）

```
{
  bmi_x100:      2285    → BMI = 22.85（正常体重）
  bmr:           1600    → 基础代谢率 1600 kcal/天
  body_fat_x10:  183     → 体脂率 18.3%
  fitness_class: 1       → 正常体型
  health_score:  99      → 健康评分 99/100
  age:           31      → 年龄 31 岁
}
```




