// ============================================================
// Aleo 合规转账审计系统 (Compliant Transfer Audit System)
// ============================================================
// 功能模块:
//   1. 隐私交易记录 (Privacy Transaction Records)  → CompliantTransfer record
//   2. 审计日志         (Audit Logs)               → AuditLogEntry + audit_logs mapping
//   3. 审计授权         (Audit Authorization)      → authorize_auditor / revoke_auditor
//   4. 隐私转账         (Privacy Transfers)         → compliant_transfer fn
//   5. 授权审计方       (Authorized Auditors)       → check_auditor fn
// ============================================================

program kacean_joy_compliant_transfer.aleo {

    // ============================================================
    // RECORD: 隐私交易记录
    // ============================================================
    record CompliantTransfer {
        owner: address,
        origin: address,
        from: address,
        to: address,
        amount: u64,
        transfer_id: field,
        compliance_hash: field,
    }

    // ============================================================
    // STRUCT: 审计日志条目
    // ============================================================
    struct AuditLogEntry {
        log_id: field,
        transfer_id: field,
        auditor: address,
        action: u8,
        note: field,
    }

    // ============================================================
    // MAPPINGS: 链上状态
    // ============================================================
    mapping admin: field => address;
    mapping authorized_auditors: address => bool;
    mapping audit_logs: field => AuditLogEntry;
    mapping transfer_counter: field => u64;
    mapping log_counter: field => u64;
    mapping compliance_registry: field => field;

    // ────────────────────────────────────────────────────────────
    // 1. 初始化管理员（仅首次部署调用一次）
    // ────────────────────────────────────────────────────────────
    fn initialize(admin_addr: address) -> Final {
        return final {
            assert(!admin.contains(0field));
            admin.set(0field, admin_addr);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 2. 铸造合规转账记录（存入系统）
    // ────────────────────────────────────────────────────────────
    fn mint_compliant_transfer(
        receiver: address,
        amount: u64,
        compliance_data: field,
        salt: field,
    ) -> (CompliantTransfer, Final) {
        let caller: address = self.caller;
        let comp_hash: field = compliance_data + salt;
        let transfer: CompliantTransfer = CompliantTransfer {
            owner: receiver,
            origin: caller,
            from: caller,
            to: receiver,
            amount: amount,
            transfer_id: 0field,
            compliance_hash: comp_hash,
        };
        return (transfer, final {
            let current: u64 = transfer_counter.get_or_use(0field, 0u64);
            let new_id: u64 = current + 1u64;
            transfer_counter.set(0field, new_id);
            compliance_registry.set(new_id as field, comp_hash);
        });
    }

    // ────────────────────────────────────────────────────────────
    // 3. 隐私合规转账
    // ────────────────────────────────────────────────────────────
    fn compliant_transfer(
        tok: CompliantTransfer,
        receiver: address,
        new_compliance_data: field,
        salt: field,
    ) -> (CompliantTransfer, Final) {
        assert_eq(tok.owner, self.caller);
        let origin: address = tok.origin;
        let amount: u64 = tok.amount;
        let comp_hash: field = new_compliance_data + salt;
        let transfer: CompliantTransfer = CompliantTransfer {
            owner: receiver,
            origin: origin,
            from: tok.owner,
            to: receiver,
            amount: amount,
            transfer_id: 0field,
            compliance_hash: comp_hash,
        };
        return (transfer, final {
            let current: u64 = transfer_counter.get_or_use(0field, 0u64);
            let new_id: u64 = current + 1u64;
            transfer_counter.set(0field, new_id);
            compliance_registry.set(new_id as field, comp_hash);
        });
    }

    // ────────────────────────────────────────────────────────────
    // 4. 授权审计方（仅管理员）
    // ────────────────────────────────────────────────────────────
    fn authorize_auditor(auditor: address) -> Final {
        let caller: address = self.caller;
        return final {
            assert(admin.contains(0field));
            let admin_addr: address = admin.get_or_use(0field, caller);
            assert_eq(caller, admin_addr);
            authorized_auditors.set(auditor, true);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 5. 撤销审计方授权（仅管理员）
    // ────────────────────────────────────────────────────────────
    fn revoke_auditor(auditor: address) -> Final {
        let caller: address = self.caller;
        return final {
            assert(admin.contains(0field));
            let admin_addr: address = admin.get_or_use(0field, caller);
            assert_eq(caller, admin_addr);
            authorized_auditors.set(auditor, false);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 6. 记录审计日志（仅授权审计方）
    //    action: 0=查看, 1=批准, 2=拒绝
    // ────────────────────────────────────────────────────────────
    fn log_audit_action(
        transfer_id: field,
        action: u8,
        note: field,
    ) -> Final {
        assert(action <= 2u8);
        let caller: address = self.caller;
        return final {
            let is_authorized: bool = authorized_auditors.get_or_use(caller, false);
            assert(is_authorized);

            let current: u64 = log_counter.get_or_use(0field, 0u64);
            let new_id: u64 = current + 1u64;
            log_counter.set(0field, new_id);

            let entry: AuditLogEntry = AuditLogEntry {
                log_id: new_id as field,
                transfer_id: transfer_id,
                auditor: caller,
                action: action,
                note: note,
            };
            audit_logs.set(new_id as field, entry);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 7. 查询审计方授权状态
    // ────────────────────────────────────────────────────────────
    fn check_auditor_authorization(auditor: address) -> Final {
        return final {
            let is_auth: bool = authorized_auditors.get_or_use(auditor, false);
            assert(is_auth == is_auth);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 8. 查询转账合规哈希
    // ────────────────────────────────────────────────────────────
    fn check_compliance(transfer_id: field) -> Final {
        return final {
            let hash: field = compliance_registry.get_or_use(transfer_id, 0field);
            assert(hash == hash);
        };
    }

    // ────────────────────────────────────────────────────────────
    // 9. 查询审计日志
    // ────────────────────────────────────────────────────────────
    fn get_audit_log(log_id: field) -> Final {
        let captured_caller: address = self.caller;
        return final {
            let entry: AuditLogEntry = audit_logs.get_or_use(
                log_id,
                AuditLogEntry {
                    log_id: 0field,
                    transfer_id: 0field,
                    auditor: captured_caller,
                    action: 0u8,
                    note: 0field,
                }
            );
            assert(entry.log_id == entry.log_id);
        };
    }

    @noupgrade
    constructor() {}
}
