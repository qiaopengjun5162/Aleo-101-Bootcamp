program simple_counter.aleo;

// 定义一个链上公开的存储：将地址（address）映射到数字（u32）
mapping account_counter: address => u32;

// 增加计数器的函数
function increment_counter:
    // 输入为调用者的地址
    input r0 as address.private;
    // 异步调用更新链上状态的 finalize 模块
    async increment_counter r0 into r1;
    output r1 as simple_counter.aleo/increment_counter.future;

// 真正修改链上数据的状态机部分
finalize increment_counter:
    input r0 as address.public;
    // 获取当前地址的计数，如果不存在则默认为 0u32
    get.or_use account_counter[r0] 0u32 into r1;
    // 计数器加 1
    add r1 1u32 into r2;
    // 将新值写回存储
    set r2 into account_counter[r0];
