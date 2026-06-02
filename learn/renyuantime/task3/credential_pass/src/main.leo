// ============================================================================
// ZK 私密资质通行证（ZK Private Credential Pass）
// ============================================================================
//
// 一句话：证明"信用分 ≥ 阈值"为真，但不暴露真实分数，也无需信任平台方。
//
// 隐私与公开状态的边界：
// - Credential 是 private record，真实分数 score 只属于持证人，链上不可见明文。
// - verified_count / used 是 public mapping，属于链上公开聚合状态。
//   · "总共有多少人通过了验证" 是公开的（verified_count）。
//   · "某张凭证是否已对某门槛使用过" 是公开的（used，用于防重放）。
//   · 但"某个人的真实分数是多少"永远是私有的。
//
// 三方角色：
// - Issuer 发证方（如征信机构）：issue_credential 签发私密凭证。
// - Holder 持证人（用户本人）：verify_threshold 生成"达标"证明。
// - Verifier 验证方（平台）：只看到 bool 结果与公开计数，看不到真实分数。
// ============================================================================


// ----------------------------------------------------------------------------
// build_nullifier
// ----------------------------------------------------------------------------
//
// 生成防重放标记（nullifier），用于 used mapping 的 key。
// 目的：同一持证人针对同一门槛只能通过一次（防止重复刷"已验证人数"）。
//
// MVP 写法：nullifier = owner as field + threshold as field
// 适合 demo 与本地测试。正式版本可换成 Poseidon(owner, threshold) 之类的哈希，
// 避免简单相加带来的理论碰撞风险。

fn build_nullifier(
    owner: address,
    threshold: u32,
) -> field {
    let owner_key: field = owner as field;
    let threshold_key: field = threshold as field;
    return owner_key + threshold_key;
}


program credential_pass.aleo {
    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------
    //
    // @noupgrade：程序部署后不可升级，表达"验证规则固定、不能被平台方随意改逻辑"，
    // 进一步强化"无需信任平台方"的叙事。
    @noupgrade
    constructor() {}


    // =========================================================================
    // Private Record
    // =========================================================================

    // -------------------------------------------------------------------------
    // Credential
    // -------------------------------------------------------------------------
    //
    // 发证方签发给持证人的私密资质凭证。
    //
    // 它是 private record，所以链上不会明文暴露：
    // - 谁持有这张凭证
    // - 真实分数 score 具体是多少（例如 820）
    //
    // 字段说明：
    // owner: 凭证拥有者，只有该 owner 本人可以使用（见 verify_threshold 的 signer 校验）。
    // score: 真实数值（如信用分）。私有，链上不可见明文。
    record Credential {
        owner: address,
        score: u32,
    }


    // =========================================================================
    // Public State (mapping)
    // =========================================================================

    // -------------------------------------------------------------------------
    // verified_count
    // -------------------------------------------------------------------------
    //
    // 已通过验证的累计人数（聚合统计，公开透明）。
    // 固定使用 key = 0u8 存放全局计数。
    // 体现"聚合数据公开、个体隐私保密"。
    mapping verified_count: u8 => u32;

    // -------------------------------------------------------------------------
    // used  (防重放 / nullifier 标记)
    // -------------------------------------------------------------------------
    //
    // nullifier => bool
    //
    // 防止同一持证人对同一门槛重复通过验证：
    // 通过后置 used[nullifier] = true；再次提交相同 (owner, threshold) 会触发 assert 失败。
    //
    // 注意（Task 3 / L1 范围说明）：
    // leo run 为本地一次性执行，public mapping 状态不跨调用持久化，
    // 因此"第二次被拒"的真实累积效果无法 live 演示。此处逻辑写好、可部署，
    // 完整 live 复现需 leo deploy 到 testnet/devnet（Task 4）。
    mapping used: field => bool;


    // =========================================================================
    // 1) Issuer 发证方：签发私密凭证
    // =========================================================================

    // -------------------------------------------------------------------------
    // issue_credential
    // -------------------------------------------------------------------------
    //
    // 发证方为持证人签发一张私密资质凭证。
    //
    // 参数：
    // receiver: 凭证接收者（持证人）地址。
    // score:    真实数值（如信用分）。进入 private record，链上不可见明文。
    //
    // 返回：
    // - Credential private record（归 receiver 所有）。
    //
    // 隐私点：
    // - 真实分数 score 被封装进 private record，链上只存在加密承诺，明文不上链。
    fn issue_credential(
        receiver: address,
        score: u32,
    ) -> Credential {
        // 基本合法性校验：分数需为正。
        assert(score > 0u32);

        return Credential {
            owner: receiver,
            score: score,
        };
    }


    // =========================================================================
    // 2) Holder 持证人：生成"达标"证明 + 公开计数 +1
    // =========================================================================

    // -------------------------------------------------------------------------
    // verify_threshold
    // -------------------------------------------------------------------------
    //
    // 持证人用自己的私密凭证，证明"真实分数 ≥ 公开阈值"为真。
    //
    // 参数：
    // cred:      持证人持有的 private Credential record。
    // threshold: 公开阈值（验证规则公开，例如 700）。
    //
    // 规则：
    // - 必须本人使用：assert_eq(self.signer, cred.owner)（B2 非本人盗用 → 失败）。
    // - 必须达标：assert(score >= threshold)（B1 未达标 → 失败，且不泄露具体差多少）。
    //
    // 返回：
    // - bool：是否达标（达标时为 true；未达标会在断言处直接失败）。
    // - Final：在链上更新公开状态（防重放标记 + 已验证人数 +1）。
    //
    // 隐私点：
    // - threshold 是 public（规则透明）；score 始终私有。
    // - 验证方只会拿到 bool 结果与公开计数，永远看不到真实分数。
    fn verify_threshold(
        cred: Credential,
        public threshold: u32,
    ) -> (bool, Final) {
        // B2：只有本人才能使用自己的凭证。
        assert_eq(self.signer, cred.owner);

        // record 字段不能直接进 final 块，先提取成普通变量。
        let owner: address = cred.owner;
        let score: u32 = cred.score;

        // B1：核心断言——真实分数必须达标。未达标在此直接失败，不泄露具体数值。
        assert(score >= threshold);

        // 防重放标记（在函数体内基于 record 字段算好，再传入 final）。
        let nullifier: field = build_nullifier(owner, threshold);

        // 达标结论（走到这里 score >= threshold 已成立，恒为 true）。
        let meets: bool = score >= threshold;

        return (meets, final {
            // B3 防重放：同一 (owner, threshold) 不能重复通过。
            let already_used: bool = used.get_or_use(nullifier, false);
            assert(!already_used);
            used.set(nullifier, true);

            // 公开计数：已通过验证的总人数 +1（聚合公开，个体隐私保密）。
            let current_count: u32 = verified_count.get_or_use(0u8, 0u32);
            verified_count.set(0u8, current_count + 1u32);
        });
    }
}
