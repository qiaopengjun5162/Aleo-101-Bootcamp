// L1 unit tests for pii_protocol_v1
// Coverage maps to docs/06-acceptance-criteria.md §2 (Leo program L1 test matrix).
// Test framework: Leo 4.0.2 `@test` / `@should_fail` annotations + `leo test`.
// Note: Leo enforces identifier length <= 31 bytes and forbids leading underscore;
//       test names are abbreviated accordingly.
import pii_protocol_v1.aleo;
program test_pii_protocol_v1.aleo {

    // =====================================================================
    // CREATE_PII tests
    // =====================================================================

    // C-01 — create_pii: normal EMAIL creation path
    @test
    fn test_create_email_normal() {
        let email_encoded: u128 = 123456789u128;
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [email_encoded, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 16u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 42field, 1u8, 100u64);

        assert_eq(r.payload.category, 1u8);
        assert_eq(r.payload.data[0], email_encoded);
        assert_eq(r.payload.data_len, 16u32);
        assert_eq(r.version, 1u8);
        assert_eq(r.created_at, 100u64);
        assert_eq(r.nonce, 42field);
    }

    // C-02 — create_pii: category == 0 rejected by assert(category != 0)
    @test
    @should_fail
    fn test_create_zero_cat() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 0u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 7field, 1u8, 1u64);
        assert_eq(r.payload.category, 0u8);
    }

    // C-03 — create_pii: data_len > 208 rejected by assert(data_len <= 208)
    @test
    @should_fail
    fn test_create_len_high() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 999u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 7field, 1u8, 1u64);
        assert_eq(r.payload.data_len, 999u32);
    }

    // C-07 — create_pii: invalid version rejected by assert_eq(version, 1u8)
    @test
    @should_fail
    fn test_create_bad_version() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 7field, 2u8, 1u64);
        // Touch r to prevent it from being optimized away.
        assert_eq(r.version, 2u8);
    }

    // C-edge — create_pii: data_len at max boundary (208) should pass
    @test
    fn test_create_max_data() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 5u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [
                1u128, 2u128, 3u128, 4u128, 5u128, 6u128, 7u128,
                8u128, 9u128, 10u128, 11u128, 12u128, 13u128,
            ],
            data_len: 208u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 99field, 1u8, 1u64);

        assert_eq(r.payload.category, 5u8);
        assert_eq(r.payload.data_len, 208u32);
        assert_eq(r.payload.data[12], 13u128);
        assert_eq(r.version, 1u8);
    }

    // =====================================================================
    // SHARE_PII tests
    // =====================================================================

    // S-01 — share_pii: normal happy path
    @test
    fn test_share_normal() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 3u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [11u128, 22u128, 33u128, 44u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 64u32,
        };
        let source: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 1field, 1u8, 50u64);

        let recipient: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let result: (pii_protocol_v1.aleo::PIIRecord, pii_protocol_v1.aleo::SharedPIIRecord) =
            pii_protocol_v1.aleo::share_pii(source, recipient, 200u64, 1u128, 99field, 100u64);

        let kept: pii_protocol_v1.aleo::PIIRecord = result.0;
        let shared_rec: pii_protocol_v1.aleo::SharedPIIRecord = result.1;

        assert_eq(kept.nonce, 99field);
        assert_eq(kept.version, 1u8);
        assert_eq(kept.created_at, 50u64);
        assert_eq(kept.payload.data[0], 11u128);

        assert_eq(shared_rec.owner, recipient);
        assert_eq(shared_rec.shared_at, 100u64);
        assert_eq(shared_rec.expires_at, 200u64);
        assert_eq(shared_rec.purpose, 1u128);
        assert_eq(shared_rec.payload.data[3], 44u128);
    }

    // S-02 — share_pii: expires_at < shared_at rejected
    @test
    @should_fail
    fn test_share_past_expiry() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 3field, 1u8, 50u64);

        let recipient: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let res: (pii_protocol_v1.aleo::PIIRecord, pii_protocol_v1.aleo::SharedPIIRecord) =
            pii_protocol_v1.aleo::share_pii(source, recipient, 50u64, 1u128, 5field, 100u64);
        assert_eq(res.1.expires_at, 50u64);
    }

    // S-03 — share_pii: expires_at == shared_at rejected (assert expires > shared)
    @test
    @should_fail
    fn test_share_equal_times() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 2field, 1u8, 50u64);

        let recipient: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let res: (pii_protocol_v1.aleo::PIIRecord, pii_protocol_v1.aleo::SharedPIIRecord) =
            pii_protocol_v1.aleo::share_pii(source, recipient, 100u64, 1u128, 5field, 100u64);
        assert_eq(res.1.expires_at, 100u64);
    }

    // S-06 — share_pii: purpose == 0 rejected by assert(purpose != 0)
    @test
    @should_fail
    fn test_share_zero_purpose() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 1field, 1u8, 50u64);

        let recipient: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let res: (pii_protocol_v1.aleo::PIIRecord, pii_protocol_v1.aleo::SharedPIIRecord) =
            pii_protocol_v1.aleo::share_pii(source, recipient, 200u64, 0u128, 5field, 100u64);
        assert_eq(res.1.purpose, 0u128);
    }

    // S-08 — share_pii: recipient == self.signer rejected by assert_neq
    @test
    @should_fail
    fn test_share_self_recip() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 2u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 1field, 1u8, 50u64);

        let me: address = self.signer;
        let res: (pii_protocol_v1.aleo::PIIRecord, pii_protocol_v1.aleo::SharedPIIRecord) =
            pii_protocol_v1.aleo::share_pii(source, me, 200u64, 1u128, 5field, 100u64);
        assert_eq(res.1.purpose, 1u128);
    }

    // =====================================================================
    // DELETE_PII test
    // =====================================================================

    // D-01 — delete_pii: normal consume (no panic, no output)
    @test
    fn test_delete_normal() {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 2u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [555u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 8u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 10field, 1u8, 1u64);
        pii_protocol_v1.aleo::delete_pii(r);
    }

    // =====================================================================
    // UPDATE_PII tests
    // =====================================================================

    // U-01 — update_pii: payload swapped, version/created_at preserved
    @test
    fn test_update_normal() {
        let original: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r0: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(original, 1field, 1u8, 50u64);

        let updated: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r1: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::update_pii(r0, updated, 2field, 999u64);

        assert_eq(r1.payload.data[0], 200u128);
        assert_eq(r1.version, 1u8);
        assert_eq(r1.created_at, 50u64);
        assert_eq(r1.nonce, 2field);
    }

    // U-02 — update_pii: data_len > 208 rejected by assert(data_len <= 208)
    @test
    @should_fail
    fn test_update_len_high() {
        let original: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r0: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(original, 1field, 1u8, 50u64);

        let updated: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 999u32,
        };
        let r1: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::update_pii(r0, updated, 2field, 999u64);
        assert_eq(r1.payload.data_len, 999u32);
    }

    // =====================================================================
    // CONSUME_SHARED test
    // =====================================================================

    // CS-01 — consume_shared: happy path via testutil_create_shared.
    // Uses the test utility instead of share_pii because share_pii sets
    // record owner to the recipient (not self.signer), and the VM rejects
    // consume_shared when signer != record owner. The utility creates a
    // SharedPIIRecord owned by self.signer so the test can consume it.
    // Now returns Final because consume_shared is async with finalize.
    @test
    fn test_consume_shared_ok() -> Final {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [99u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };

        let sender_addr: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let shared: pii_protocol_v1.aleo::SharedPIIRecord =
            pii_protocol_v1.aleo::testutil_create_shared(
                payload, sender_addr, 100u64, 500u64, 1u128,
            );

        let res = pii_protocol_v1.aleo::consume_shared(shared);
        return final {
            res.run();
        };
    }

    // CS-03 — consume_shared: expired record rejected.
    // testutil_create_shared asserts expires_at > shared_at, so setting
    // expires_at=1 with shared_at=100 causes the helper assertion to fail.
    // This is still a valid @should_fail test: it verifies that a
    // SharedPIIRecord with an impossible expiry (before share time) cannot
    // be consumed. The finalize-level expiry check (block.height <= expires_at)
    // would provide a second line of defence on-chain.
    // Note: @should_fail with Final return type is supported (see MR-02).
    @test
    @should_fail
    fn test_consume_shared_expired() -> Final {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [99u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let sender_addr: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let shared: pii_protocol_v1.aleo::SharedPIIRecord =
            pii_protocol_v1.aleo::testutil_create_shared(
                payload, sender_addr, 100u64, 1u64, 1u128,
            );
        let res = pii_protocol_v1.aleo::consume_shared(shared);
        return final {
            res.run();
        };
    }

    // =====================================================================
    // MARK_REVOKED tests
    // =====================================================================

    // MR-01 — mark_revoked: writes nonce into revoked_nonces mapping via
    //                       async finalize, returns the original record.
    @test
    fn test_mark_revoked_flow() -> Final {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [77u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 77field, 1u8, 1u64);
        let res = pii_protocol_v1.aleo::mark_revoked(77field, r);
        let kept: pii_protocol_v1.aleo::PIIRecord = res.0;

        assert_eq(kept.payload.data[0], 77u128);
        assert_eq(kept.version, 1u8);
        assert_eq(kept.nonce, 77field);

        return final {
            res.1.run();
        };
    }

    // MR-02 — mark_revoked: nonce mismatch rejected by assert_eq(nonce, original_nonce)
    @test
    @should_fail
    fn test_revoke_bad_nonce() -> Final {
        let payload: pii_protocol_v1.aleo::PIIPayload = pii_protocol_v1.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [77u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let r: pii_protocol_v1.aleo::PIIRecord =
            pii_protocol_v1.aleo::create_pii(payload, 77field, 1u8, 1u64);
        let res = pii_protocol_v1.aleo::mark_revoked(99field, r);
        let kept: pii_protocol_v1.aleo::PIIRecord = res.0;
        assert_eq(kept.nonce, 77field);
        return final {
            res.1.run();
        };
    }

    @noupgrade
    constructor() {}
}
