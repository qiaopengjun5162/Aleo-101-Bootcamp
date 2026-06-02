// Cross-program tests for consumer_poc.aleo (Program B)
// These tests probe V1 (atomicity), V2 (record consumption), V3 (struct return).
//
// Syntax: Leo 4.x Final/final{} pattern.
// Note: helper fns cannot be called from @test fns (ETYC0372043).
//       All payload construction is inlined.
//
// IMPORTANT CAVEAT: Leo `leo test` may not be able to execute cross-program
// finalize calls locally. If cross-program finalize is not supported in the
// test runner, these tests will fail to compile or run — that itself is a
// finding. Compilation success alone confirms type-checking of the cross-program
// call pattern.

import pii_poc.aleo;
import consumer_poc.aleo;

program test_consumer_poc.aleo {

    @noupgrade
    constructor() {}

    // -------------------------------------------------------------------------
    // T1 — Happy path: mint with far-future expiry, place_order succeeds
    // V1 probe: orders mapping should be set (atomicity holds on success)
    // V2 probe: B passes A's record to A's consume_shared — compiles and runs
    // -------------------------------------------------------------------------
    @test
    fn test_place_order_happy() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 2u8,
            data: [10u128, 20u128, 30u128, 40u128],
            data_len: 32u32,
        };
        // owner = self.signer so the same key can call place_order
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 100field, 999999u64);

        let f: Final = consumer_poc.aleo::place_order(shared, 1u64);
        return final {
            f.run();
        };
    }

    // -------------------------------------------------------------------------
    // T2 — Expired: mint with expires_at=0, place_order must FAIL
    // V1 probe: if A's finalize fails, B's orders write must NOT persist
    // Note: in leo test block.height=0, so expires_at=0 means 0<=0 which PASSES.
    // This test documents the limitation: expiry-based failure cannot be
    // triggered locally. The @should_fail annotation captures the INTENT.
    // If this test does NOT fail (because height=0 <= 0), that is the finding:
    // expiry tests require a live network with height > 0.
    // -------------------------------------------------------------------------
    @test
    @should_fail
    fn test_place_order_expired() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 1u8,
            data: [10u128, 20u128, 30u128, 40u128],
            data_len: 32u32,
        };
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 200field, 0u64);

        let f: Final = consumer_poc.aleo::place_order(shared, 2u64);
        return final {
            f.run();
        };
    }

    // -------------------------------------------------------------------------
    // T3 — Revoked: revoke share_id first, then place_order must FAIL
    // V1 probe: revocation enforced cross-program; B's orders write rolls back
    // Note: in leo test, both finals run in sequence. The revoke final sets
    // revoked[300field]=true, then place_order's final reads it and asserts false.
    // If the test runner executes finals sequentially in the same state, T3 will
    // correctly fail. If finals are isolated, T3 may not fail — that is the finding.
    // -------------------------------------------------------------------------
    @test
    @should_fail
    fn test_place_order_revoked() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 1u8,
            data: [10u128, 20u128, 30u128, 40u128],
            data_len: 32u32,
        };
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 300field, 999999u64);

        // Revoke the share_id first
        let revoke_f: Final = pii_poc.aleo::revoke(300field);

        // Now attempt to consume — should fail because revoked=true
        let order_f: Final = consumer_poc.aleo::place_order(shared, 3u64);

        return final {
            revoke_f.run();
            order_f.run();
        };
    }

    // -------------------------------------------------------------------------
    // T4 — V3: read_category compiles and returns the correct category value
    // -------------------------------------------------------------------------
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
}
