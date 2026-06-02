// ROOT-CALL HYPOTHESIS TEST
// Throwaway research — do NOT commit.
//
// Hypothesis: ESAZ0374004 is a TEST-HARNESS ARTIFACT triggered by the call
// SEQUENCE (non-Final call PRECEDING a Final-wrapping-Final call in the same
// test fn). If place_order is the ONLY call in a test fn (no preceding
// non-Final call), ESAZ0374004 should NOT fire.
//
// Strategy: construct SharedPIIRecord as a record literal directly in the
// test fn WITHOUT calling mint_share first. This eliminates the non-Final
// call that preceded place_order in the prior tests.
//
// Three test structures tried:
//   TA — ONLY place_order, record constructed as literal (no mint_share)
//   TB — ONLY place_order with expires_at=0 (@should_fail), no mint_share
//   TC — mint_share THEN place_order (the prior failing pattern, as control)
//
// Expected:
//   TA: if hypothesis is correct → compiles and runs WITHOUT ESAZ0374004
//   TB: if hypothesis is correct → compiles and runs WITHOUT ESAZ0374004
//   TC: should reproduce ESAZ0374004 (control — confirms the trigger condition)

import pii_poc.aleo;
import consumer_poc.aleo;

program test_root_call_hypothesis.aleo {

    @noupgrade
    constructor() {}

    // -------------------------------------------------------------------------
    // TA — ONLY place_order, record constructed as literal (no mint_share call)
    // If ESAZ0374004 does NOT fire here, the error is sequence-dependent.
    // -------------------------------------------------------------------------
    @test
    fn test_place_order_only_no_mint() -> Final {
        // Construct the record directly as a literal — no mint_share call.
        // This is the key: there is NO preceding non-Final call in this fn.
        let shared: pii_poc.aleo::SharedPIIRecord = pii_poc.aleo::SharedPIIRecord {
            owner: self.signer,
            payload: pii_poc.aleo::PIIPayload {
                category: 3u8,
                data: [1u128, 2u128, 3u128, 4u128],
                data_len: 16u32,
            },
            share_id: 1000field,
            expires_at: 999999u64,
        };

        // place_order is the FIRST AND ONLY entry-point call in this fn.
        let f: Final = consumer_poc.aleo::place_order(shared, 10u64);
        return final {
            f.run();
        };
    }

    // -------------------------------------------------------------------------
    // TB — ONLY place_order with expires_at=0 (@should_fail), no mint_share
    // Tests whether the expiry path also avoids ESAZ0374004 when no non-Final
    // call precedes it.
    // -------------------------------------------------------------------------
    @test
    @should_fail
    fn test_place_order_expired_only() -> Final {
        let shared: pii_poc.aleo::SharedPIIRecord = pii_poc.aleo::SharedPIIRecord {
            owner: self.signer,
            payload: pii_poc.aleo::PIIPayload {
                category: 1u8,
                data: [1u128, 2u128, 3u128, 4u128],
                data_len: 16u32,
            },
            share_id: 2000field,
            expires_at: 0u64,
        };

        let f: Final = consumer_poc.aleo::place_order(shared, 20u64);
        return final {
            f.run();
        };
    }

    // -------------------------------------------------------------------------
    // TC — CONTROL: mint_share (non-Final) THEN place_order (Final-wrapping-Final)
    // This reproduces the prior ESAZ0374004 trigger. Expected to FAIL to compile.
    // Kept here to confirm the trigger condition is still active.
    // NOTE: If this file fails to compile entirely due to TC, comment TC out and
    // re-run TA/TB in isolation. The compile error on TC is the expected finding.
    // -------------------------------------------------------------------------
    @test
    fn test_place_order_mint_control() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 2u8,
            data: [10u128, 20u128, 30u128, 40u128],
            data_len: 32u32,
        };
        // NON-FINAL call first — this is the trigger
        let shared: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 3000field, 999999u64);

        // Final-wrapping-Final call after non-Final — expected to trigger ESAZ0374004
        let f: Final = consumer_poc.aleo::place_order(shared, 30u64);
        return final {
            f.run();
        };
    }
}
