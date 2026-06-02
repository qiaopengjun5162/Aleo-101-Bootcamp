// private_gate_pass.aleo
//
// 匿名凭证 / 选择性披露门禁 (Anonymous credential gate-pass)
//
// 一个发证方向持有者签发「私密凭证」(record，加密给持有者)。持有者之后可以向某个
// 门禁证明「我是该发证方的 tier >= N 会员，且未过期」——而**不暴露**自己是谁、用了
// 哪张凭证、具体几级、或两次到访是不是同一人。
//
// - 隐私是刚需：去掉隐私它就退化成「公开会员名单 + 签名验证」，任何链都能做。
// - 链上只公开：一个 per-gate 的访问计数，和被花掉的 nullifier(不可逆，看不出是谁)。
// - tier >= N 的比较发生在私密 transition 里(选择性披露：证明性质而不暴露具体值)。
// - nullifier 在链上用私密 record 字段 + struct 哈希派生，防止同一凭证对同一门禁重复刷。
program private_gate_pass.aleo {
    @noupgrade
    constructor() {}

    // 私密会员凭证，加密给持有者。链上以密文存储，只有 owner 能解。
    record Credential {
        owner: address, // 持有者(决定加密目标 + 花费权)
        issuer: field, // 发证方标识(如发证方名称的哈希)
        tier: u8, // 会员等级
        expiry: u32, // 过期 epoch
        secret: field, // per-credential 私密随机数，用于派生 nullifier
    }

    // nullifier 的哈希原像。用 struct 做组合子(抗碰撞)，而不是 field 相加。
    struct NullifierPreimage {
        secret: field,
        gate_id: field,
        epoch: u32,
    }

    // 公开：已花费的 nullifier(防止同一凭证对同一门禁+epoch 重复使用)
    mapping spent_nullifiers: field => bool;
    // 公开：每个门禁(gate_id)的累计访问数——链上唯一可读的统计量
    mapping gate_access_count: field => u64;

    // 发证方签发一张凭证给持有者。
    // 注：本 demo 不对发证做访问控制(任何人可签发任意凭证)——真实场景应
    //     assert self.signer 属于授权发证方集合。选择性披露/不可关联性不依赖这一点。
    fn issue(
        holder: address,
        issuer: field,
        tier: u8,
        expiry: u32,
        secret: field,
    ) -> Credential {
        return Credential {
            owner: holder,
            issuer: issuer,
            tier: tier,
            expiry: expiry,
            secret: secret,
        };
    }

    // 持有者证明：本凭证来自 issuer_req、tier >= min_tier、在 epoch 时未过期——
    // 全程不暴露凭证内容。链上派生 nullifier、重新产出凭证(不销毁)、并记录公开状态。
    fn prove_access(
        cred: Credential,
        issuer_req: field,
        min_tier: u8,
        gate_id: field,
        epoch: u32,
    ) -> (Credential, Final) {
        // 选择性披露：断言性质而不泄露具体值
        assert_eq(cred.issuer, issuer_req);
        assert(cred.tier >= min_tier);
        assert(cred.expiry >= epoch);

        // nullifier = hash(secret, gate_id, epoch)——跨门禁/跨 epoch 不可关联
        let nul: field = BHP256::hash_to_field(NullifierPreimage {
            secret: cred.secret,
            gate_id: gate_id,
            epoch: epoch,
        });

        // 重新产出同样的凭证给持有者，避免验证时把凭证花掉
        let reissued: Credential = Credential {
            owner: cred.owner,
            issuer: cred.issuer,
            tier: cred.tier,
            expiry: cred.expiry,
            secret: cred.secret,
        };

        return (reissued, final {
            // 同一凭证对同一门禁+epoch 只能过一次
            let used: bool = spent_nullifiers.get_or_use(nul, false);
            assert(!used);
            spent_nullifiers.set(nul, true);
            let cur: u64 = gate_access_count.get_or_use(gate_id, 0u64);
            gate_access_count.set(gate_id, cur + 1u64);
        });
    }
}
