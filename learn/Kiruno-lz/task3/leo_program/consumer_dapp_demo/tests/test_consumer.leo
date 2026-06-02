// L1 unit tests for consumer_dapp_demo (B-model and C-model)
// Coverage: Basic compilation and type checking for cross-program calls
// Test framework: Leo 4.0.2 `@test` annotation + `leo test`
// Note: Full B-model (place_order) and C-model (verify_age_access) tests with nested Final
//       require L2/L3 testnet execution due to snarkVM limitation
//       (https://github.com/AleoNet/snarkVM/issues/2570)
import consumer_dapp_demo.aleo;
import pii_protocol_v2.aleo;

program test_consumer.aleo {

    @noupgrade
    constructor() {}

    // =====================================================================
    // B-model: Verify reveal (struct return across programs - V3)
    // =====================================================================

    @test
    fn test_reveal_payload() {
        // Create a PIIRecord with ADDRESS category
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 1u8,  // ADDRESS
            label_lo: 0u128,
            label_hi: 0u128,
            data: [987654321u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 60u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 10field, 2u8, 1000u64);

        // Share to create SharedPIIRecord
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 5000u64, 1u128, 888field, 1u8, 20field, 2000u64);

        // Test reveal functionality (V3: struct return across programs)
        // This is the key operation used by place_order to read category field
        let revealed: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::reveal(shared);
        assert_eq(revealed.category, 1u8);
        assert_eq(revealed.data[0], 987654321u128);
        assert_eq(revealed.data_len, 60u32);
    }

    @test
    fn test_reveal_name_category() {
        // Test reveal with NAME category
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 2u8,  // NAME
            label_lo: 0u128,
            label_hi: 0u128,
            data: [111222333u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 30u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 15field, 2u8, 1000u64);

        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 5000u64, 2u128, 777field, 2u8, 25field, 2000u64);

        let revealed: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::reveal(shared);
        assert_eq(revealed.category, 2u8);
        assert_eq(revealed.data[0], 111222333u128);
    }

    // =====================================================================
    // C-model: Verify attestation creation
    // =====================================================================

    @test
    fn test_verify_age_attestation() {
        // Create a KYC PIIRecord with birth date 1990-03-15
        let birth_date: u32 = 19900315u32;
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 6u8,  // KYC
            label_lo: 0u128,
            label_hi: 0u128,
            data: [(birth_date as u128), 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 30field, 2u8, 1000u64);

        // Share to create SharedPIIRecord
        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 5000u64, 3u128, 555field, 6u8, 40field, 2000u64);

        // Verify age > 18 (current block height: ~1296000 ≈ 2026-05-31)
        // This creates the Attestation that verify_age_access would consume
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 18u8, 555field, 5000u64, 1296000u32);

        // Verify attestation fields
        assert_eq(att.predicate_result, true);
        assert_eq(att.attested_category, 6u8);
        assert_eq(att.share_id, 555field);
        assert_eq(att.expires_at, 5000u64);
    }

    @test
    fn test_verify_age_older() {
        // Test with older person (age 46)
        let birth_date: u32 = 19800101u32;
        let payload: pii_protocol_v2.aleo::PIIPayload = pii_protocol_v2.aleo::PIIPayload {
            category: 6u8,  // KYC
            label_lo: 0u128,
            label_hi: 0u128,
            data: [(birth_date as u128), 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128, 0u128],
            data_len: 4u32,
        };
        let source: pii_protocol_v2.aleo::PIIRecord = pii_protocol_v2.aleo::create_pii(payload, 50field, 2u8, 1000u64);

        let recipient: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (kept, shared, receipt): (pii_protocol_v2.aleo::PIIRecord, pii_protocol_v2.aleo::SharedPIIRecord, pii_protocol_v2.aleo::ShareReceipt) =
            pii_protocol_v2.aleo::share(source, recipient, 5000u64, 4u128, 444field, 6u8, 60field, 2000u64);

        // Verify age > 21
        let att: pii_protocol_v2.aleo::Attestation = pii_protocol_v2.aleo::verify_age_gt(shared, 21u8, 444field, 5000u64, 1296000u32);

        assert_eq(att.predicate_result, true);
        assert_eq(att.share_id, 444field);
    }

}
