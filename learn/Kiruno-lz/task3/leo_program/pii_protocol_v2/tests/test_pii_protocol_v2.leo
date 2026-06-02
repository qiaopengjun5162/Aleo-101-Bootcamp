// L1 unit tests for pii_protocol_v2
// Coverage: happy paths + boundary/failure cases for all v2 transitions
// Test framework: Leo 4.0.2 `@test` / `@should_fail` annotations + `leo test`
// Note: Finalize state (revoked mapping, block.height checks) cannot be verified
//       in pure Leo tests — those require L2/L3 testnet execution.
import pii_protocol_v2.aleo;

program test_pii_protocol_v2.aleo {

    @noupgrade
    constructor() {}

    // =====================================================================
    // CREATE_PII tests
    // =====================================================================

    @test
    fn test_create_pii_happy() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,  // ADDRESS
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 50u32,
        };
        let r: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 42field, 2u8, 1000u64);
        assert_eq(r.version, 2u8);
        assert_eq(r.nonce, 42field);
        assert_eq(r.payload.category, 1u8);
        assert_eq(r.created_at, 1000u64);
    }

    @test
    @should_fail
    fn test_create_cat_zero() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 0u8,  // RESERVED, should fail
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let r: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        assert_eq(r.version, 2u8);
    }

    @test
    @should_fail
    fn test_create_ver_wrong() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let r: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 1u8, 1u64);
        assert_eq(r.version, 1u8);
    }

    // =====================================================================
    // UPDATE_PII tests
    // =====================================================================

    @test
    fn test_update_pii_happy() {
        let payload1: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 2u8,  // NAME
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 20u32,
        };
        let r1: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload1, 10field, 2u8, 500u64);

        let payload2: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 2u8,  // same category
            label_lo: 0u128,
            label_hi: 0u128,
            data: [200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 25u32,
        };
        let r2: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::update_pii(r1, payload2, 20field, 600u64);
        assert_eq(r2.nonce, 20field);
        assert_eq(r2.payload.data[0], 200u128);
        assert_eq(r2.version, 2u8);
        assert_eq(r2.created_at, 500u64);  // unchanged
    }

    @test
    @should_fail
    fn test_update_cat_change() {
        let payload1: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 3u8,  // PHONE
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 15u32,
        };
        let r1: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload1, 1field, 2u8, 100u64);

        let payload2: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 4u8,  // EMAIL, different category
            label_lo: 0u128,
            label_hi: 0u128,
            data: [200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 20u32,
        };
        let r2: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::update_pii(r1, payload2, 2field, 200u64);
        assert_eq(r2.payload.category, 4u8);
    }

    // =====================================================================
    // DELETE_PII test
    // =====================================================================

    @test
    fn test_delete_pii() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let r: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        pii_protocol_v2.aleo::delete_pii(r);
        // No output to assert; consume-only
    }

    // =====================================================================
    // SHARE tests
    // =====================================================================

    @test
    fn test_share_happy() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,  // ADDRESS
            label_lo: 0u128,
            label_hi: 0u128,
            data: [123u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 50u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 10field, 2u8, 1000u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 999field, 1u8, 20field, 1500u64);
        assert_eq(kept.nonce, 20field);
        assert_eq(shared.share_id, 999field);
        assert_eq(shared.requested_category, 1u8);
        assert_eq(receipt.share_id, 999field);
        assert_eq(receipt.shared_category, 1u8);
    }

    @test
    @should_fail
    fn test_share_expires_bad() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 100u64, 1u128, 1field, 1u8, 2field, 200u64);  // expires_at < shared_at
        assert_eq(shared.share_id, 1field);
    }

    @test
    @should_fail
    fn test_share_purpose_zero() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 200u64, 0u128, 1field, 1u8, 2field, 100u64);  // purpose=0
        assert_eq(shared.purpose, 0u128);
    }

    @test
    @should_fail
    fn test_share_cat_mismatch() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 2u8,  // NAME
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 200u64, 1u128, 1field, 3u8, 2field, 100u64);  // requested_category=3 != source.category=2
        assert_eq(shared.requested_category, 3u8);
    }

    // =====================================================================
    // REVEAL test
    // =====================================================================

    @test
    fn test_reveal() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 4u8,  // EMAIL
            label_lo: 0u128,
            label_hi: 0u128,
            data: [999u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 30u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 200u64, 1u128, 1field, 4u8, 2field, 100u64);
        let revealed: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::reveal(shared);
        assert_eq(revealed.category, 4u8);
        assert_eq(revealed.data[0], 999u128);
        assert_eq(revealed.data_len, 30u32);
    }

    // =====================================================================
    // VERIFY_AGE_GT tests
    // =====================================================================

    @test
    fn test_verify_age_happy() {
        // Birth date: 1990-03-15 = 19900315u32
        let birth_date: u32 = 19900315u32;
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 6u8,  // KYC
            label_lo: 0u128,
            label_hi: 0u128,
            data: [(birth_date as u128), 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 1field, 6u8, 2field, 1500u64);
        // Current block height: assume 2026-05-31 ≈ 20260531, genesis 20260101, diff ~150 days ≈ 150*8640 blocks ≈ 1296000
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 18u8, 1field, 2000u64, 1296000u32);
        assert_eq(att.predicate_result, true);
        assert_eq(att.attested_category, 6u8);
        assert_eq(att.share_id, 1field);
    }

    @test
    @should_fail
    fn test_verify_age_young() {
        // Birth date: 2010-01-01 = 20100101u32 (too young)
        let birth_date: u32 = 20100101u32;
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 6u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [(birth_date as u128), 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 1field, 6u8, 2field, 1500u64);
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 18u8, 1field, 2000u64, 1296000u32);
        assert_eq(att.predicate_result, true);
    }

    @test
    @should_fail
    fn test_verify_age_wrong_cat() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,  // ADDRESS, not KYC
            label_lo: 0u128,
            label_hi: 0u128,
            data: [19900315u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 1field, 1u8, 2field, 1500u64);
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 18u8, 1field, 2000u64, 1296000u32);
        assert_eq(att.attested_category, 6u8);
    }

    // =====================================================================
    // CONSUME_ATTESTATION test
    // =====================================================================
    // NOTE: consume_attestation/revoke/consume_shared return Final, so tests
    // calling them must also return Final. Leo test framework cannot verify
    // finalize execution (mapping writes, block.height checks) — those require
    // L2/L3 testnet execution. These tests only verify the transition authorizes.

    @test
    fn test_consume_attestation() -> Final {
        let birth_date: u32 = 19900315u32;
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 6u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [(birth_date as u128), 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 1field, 6u8, 2field, 1500u64);
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 18u8, 1field, 2000u64, 1296000u32);
        let f: Final = pii_protocol_v2.aleo::consume_attestation(att);
        return final {
            f.run();
        };
    }

    // =====================================================================
    // REVOKE test
    // =====================================================================

    @test
    fn test_revoke() -> Final {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 200u64, 1u128, 999field, 1u8, 2field, 100u64);
        let f: Final = pii_protocol_v2.aleo::revoke(receipt);
        return final {
            f.run();
        };
    }

    // =====================================================================
    // CONSUME_SHARED test (re-mint pattern)
    // =====================================================================

    @test
    fn test_consume_shared() -> Final {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 2000u64, 1u128, 1field, 1u8, 2field, 1500u64);
        let (new_shared, fin): (pii_protocol_v2.aleo::SharedPIIRecord, Final) = pii_protocol_v2.aleo::consume_shared(shared);
        assert_eq(new_shared.share_id, 1field);
        assert_eq(new_shared.expires_at, 2000u64);
        return final {
            fin.run();
        };
    }

    // =====================================================================
    // SHARE_BUNDLE tests
    // =====================================================================

    @test
    fn test_share_bundle_four_cats() {
        // Create 4 PIIRecords with different categories: ADDRESS, NAME, PHONE, EMAIL
        let payload_address: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,  // ADDRESS
            label_lo: 0u128,
            label_hi: 0u128,
            data: [100u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 50u32,
        };
        let source0: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload_address, 10field, 2u8, 1000u64);

        let payload_name: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 2u8,  // NAME
            label_lo: 0u128,
            label_hi: 0u128,
            data: [200u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 30u32,
        };
        let source1: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload_name, 20field, 2u8, 1000u64);

        let payload_phone: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 3u8,  // PHONE
            label_lo: 0u128,
            label_hi: 0u128,
            data: [300u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 15u32,
        };
        let source2: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload_phone, 30field, 2u8, 1000u64);

        let payload_email: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 4u8,  // EMAIL
            label_lo: 0u128,
            label_hi: 0u128,
            data: [400u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 40u32,
        };
        let source3: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload_email, 40field, 2u8, 1000u64);

        // Call share_bundle with all 4 records
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let expires_at: u64 = 5000u64;
        let purpose: u128 = 1u128;
        let shared_at: u64 = 2000u64;

        let (kept0, kept1, kept2, kept3, shared0, shared1, shared2, shared3, receipt0, receipt1, receipt2, receipt3):
            (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord,
             pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord,
             pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share_bundle(
                source0, source1, source2, source3,
                recipient,
                expires_at,
                purpose,
                100field, 200field, 300field, 400field,  // new_nonces
                shared_at,
                1001field, 1002field, 1003field, 1004field  // share_ids
            );

        // Verify 4 kept PIIRecords
        assert_eq(kept0.nonce, 100field);
        assert_eq(kept0.payload.category, 1u8);
        assert_eq(kept1.nonce, 200field);
        assert_eq(kept1.payload.category, 2u8);
        assert_eq(kept2.nonce, 300field);
        assert_eq(kept2.payload.category, 3u8);
        assert_eq(kept3.nonce, 400field);
        assert_eq(kept3.payload.category, 4u8);

        // Verify 4 SharedPIIRecords
        assert_eq(shared0.share_id, 1001field);
        assert_eq(shared0.requested_category, 1u8);
        assert_eq(shared0.expires_at, expires_at);
        assert_eq(shared0.purpose, purpose);

        assert_eq(shared1.share_id, 1002field);
        assert_eq(shared1.requested_category, 2u8);
        assert_eq(shared1.expires_at, expires_at);
        assert_eq(shared1.purpose, purpose);

        assert_eq(shared2.share_id, 1003field);
        assert_eq(shared2.requested_category, 3u8);
        assert_eq(shared2.expires_at, expires_at);
        assert_eq(shared2.purpose, purpose);

        assert_eq(shared3.share_id, 1004field);
        assert_eq(shared3.requested_category, 4u8);
        assert_eq(shared3.expires_at, expires_at);
        assert_eq(shared3.purpose, purpose);

        // Verify 4 ShareReceipts
        assert_eq(receipt0.share_id, 1001field);
        assert_eq(receipt0.shared_category, 1u8);
        assert_eq(receipt1.share_id, 1002field);
        assert_eq(receipt1.shared_category, 2u8);
        assert_eq(receipt2.share_id, 1003field);
        assert_eq(receipt2.shared_category, 3u8);
        assert_eq(receipt3.share_id, 1004field);
        assert_eq(receipt3.shared_category, 4u8);

        // Verify all share_ids are different
        assert_neq(shared0.share_id, shared1.share_id);
        assert_neq(shared0.share_id, shared2.share_id);
        assert_neq(shared0.share_id, shared3.share_id);
        assert_neq(shared1.share_id, shared2.share_id);
        assert_neq(shared1.share_id, shared3.share_id);
        assert_neq(shared2.share_id, shared3.share_id);
    }

    @test
    @should_fail
    fn test_share_bundle_expires_bad() {
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,
            label_lo: 0u128,
            label_hi: 0u128,
            data: [1u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 10u32,
        };
        let source0: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 1field, 2u8, 1u64);
        let source1: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 2field, 2u8, 1u64);
        let source2: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 3field, 2u8, 1u64);
        let source3: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 4field, 2u8, 1u64);

        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;

        let (kept0, kept1, kept2, kept3, shared0, shared1, shared2, shared3, receipt0, receipt1, receipt2, receipt3):
            (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::PIIRecord,
             pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::SharedPIIRecord,
             pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share_bundle(
                source0, source1, source2, source3,
                recipient,
                100u64,  // expires_at
                1u128,
                10field, 20field, 30field, 40field,
                200u64,  // shared_at > expires_at
                1field, 2field, 3field, 4field
            );

        assert_eq(shared0.share_id, 1field);
    }

}
