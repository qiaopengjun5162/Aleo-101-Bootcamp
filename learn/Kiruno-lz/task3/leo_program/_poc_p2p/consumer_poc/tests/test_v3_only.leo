// Minimal test: only T4 (V3 struct return) — no Final composition.
// This isolates the V3 probe from the ESAZ0374004 error on T1/T2/T3.

import pii_poc.aleo;
import consumer_poc.aleo;

program test_v3_only.aleo {

    @noupgrade
    constructor() {}

    // T4 — V3: read_category compiles and returns the correct category value.
    // This confirms struct-return-across-programs works in Leo 4.0.2.
    @test
    fn test_read_category() {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 5u8,
            data: [10u128, 20u128, 30u128, 40u128],
            data_len: 32u32,
        };
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 400field, 999999u64);

        let cat: u8 = consumer_poc.aleo::read_category(shared);
        assert_eq(cat, 5u8);
    }

    // T4b — V3 direct: call pii_poc.aleo/reveal directly from test program.
    // Confirms the struct return works even without going through consumer_poc.
    @test
    fn test_reveal_direct() {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 9u8,
            data: [100u128, 200u128, 300u128, 400u128],
            data_len: 16u32,
        };
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 500field, 999999u64);

        let result: pii_poc.aleo::PIIPayload = pii_poc.aleo::reveal(shared);
        assert_eq(result.category, 9u8);
        assert_eq(result.data[2], 300u128);
    }
}
