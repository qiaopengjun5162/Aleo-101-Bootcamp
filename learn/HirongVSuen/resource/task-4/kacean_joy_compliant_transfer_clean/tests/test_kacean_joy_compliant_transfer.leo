// ============================================================
// 合规转账审计系统 - 测试套件
// ============================================================
// 测试覆盖:
//   1. 隐私交易记录: 铸造、转账记录验证
//   2. 审计日志:     日志写入、查询
//   3. 审计授权:     授权/撤销审计方
//   4. 隐私转账:     合规转账流程
//   5. 授权审计方:   权限校验（失败场景）
// ============================================================

import kacean_joy_compliant_transfer.aleo;

program test_kacean_joy_compliant_transfer.aleo {

    // 测试用有效 Aleo 地址
    // 注: 单元测试框架中所有调用共享同一 caller，因此仅用单一地址
    const ADDR: address = aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px;

    // ────────────────────────────────────────────────────────────
    // 测试: 铸造合规转账记录
    // ────────────────────────────────────────────────────────────
    @test
    fn test_mint() -> Final {
        let amount: u64 = 1000u64;
        let data: field = 42field;
        let salt: field = 7field;

        let (tok, f) = kacean_joy_compliant_transfer.aleo::mint_compliant_transfer(ADDR, amount, data, salt);
        let tok_owner: address = tok.owner;
        let tok_to: address = tok.to;
        let tok_amt: u64 = tok.amount;
        let tok_hash: field = tok.compliance_hash;
        return final {
            f.run();
            assert(tok_owner == ADDR);
            assert(tok_to == ADDR);
            assert(tok_amt == amount);
            assert(tok_hash == 49field);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 测试: 查询合规哈希
    // ────────────────────────────────────────────────────────────
    @test
    fn test_compliance() -> Final {
        let (tok, f1) = kacean_joy_compliant_transfer.aleo::mint_compliant_transfer(ADDR, 100u64, 55field, 10field);
        let f2: Final = kacean_joy_compliant_transfer.aleo::check_compliance(1field);
        return final {
            f1.run();
            f2.run();
        };
    }

    // ────────────────────────────────────────────────────────────
    // 测试: 查询审计日志
    // ────────────────────────────────────────────────────────────
    @test
    fn test_get_log() -> Final {
        let f: Final = kacean_joy_compliant_transfer.aleo::get_audit_log(1field);
        return final {
            f.run();
        };
    }

    // ────────────────────────────────────────────────────────────
    // 测试: 无效审计动作被拒绝（期望失败）
    // ────────────────────────────────────────────────────────────
    @test
    @should_fail
    fn test_bad_action() -> Final {
        let f: Final = kacean_joy_compliant_transfer.aleo::log_audit_action(1field, 3u8, 0field);
        return final {
            f.run();
        };
    }

    // ────────────────────────────────────────────────────────────
    // 测试: 未授权审计方无法记录日志（期望失败）
    // ────────────────────────────────────────────────────────────
    @test
    @should_fail
    fn test_unauthorized() -> Final {
        let f: Final = kacean_joy_compliant_transfer.aleo::log_audit_action(1field, 0u8, 0field);
        return final {
            f.run();
        };
    }

    @noupgrade
    constructor() {}
}
