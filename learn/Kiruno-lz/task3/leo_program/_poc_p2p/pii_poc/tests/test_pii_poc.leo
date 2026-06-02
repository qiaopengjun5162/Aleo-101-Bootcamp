// L1 tests for pii_poc.aleo (Program A standalone)
// Tests: mint_share, consume_shared (expiry path), revoke, reveal.
// Cross-program tests (V1/V2/V3) live in consumer_poc/tests/.
//
// Syntax: Leo 4.x Final/final{} pattern — matches aleo_pii_protocol_v1 tests.
// Note: helper fns cannot be called from @test fns (ETYC0372043).
//       All payload construction is inlined.

import pii_poc.aleo;

program test_pii_poc.aleo {

    @noupgrade
    constructor() {}

    // -------------------------------------------------------------------------
    // mint_share tests
    // -------------------------------------------------------------------------

    // M-01: mint_share happy path — record fields match inputs
    @test
    fn test_mint_share_ok() {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 3u8,
            data: [111u128, 222u128, 333u128, 444u128],
            data_len: 64u32,
        };
        let recipient: address = aleo1fxs9s0w97lmkwlcmgn0z3nuxufdee5yck9wqrs0umevp7qs0sg9q5xxxzh;
        let r: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, recipient, 42field, 9999u64);

        assert_eq(r.owner, recipient);
        assert_eq(r.share_id, 42field);
        assert_eq(r.expires_at, 9999u64);
        assert_eq(r.payload.category, 3u8);
        assert_eq(r.payload.data[0], 111u128);
        assert_eq(r.payload.data_len, 64u32);
    }

    // -------------------------------------------------------------------------
    // consume_shared tests (standalone — no cross-program finalize)
    // -------------------------------------------------------------------------

    // CS-A-01: consume_shared happy path — returns fresh record + Final
    @test
    fn test_consume_shared_ok() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 1u8,
            data: [111u128, 222u128, 333u128, 444u128],
            data_len: 64u32,
        };
        // owner = self.signer so the same key can consume
        let r: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 10field, 999999u64);

        let res: (pii_poc.aleo::SharedPIIRecord, Final) =
            pii_poc.aleo::consume_shared(r);
        let fresh: pii_poc.aleo::SharedPIIRecord = res.0;
        assert_eq(fresh.share_id, 10field);
        assert_eq(fresh.payload.category, 1u8);

        return final {
            res.1.run();
        };
    }

    // CS-A-02: consume_shared with expires_at = 0 — finalize assert should fail.
    // In leo test block.height = 0, so (0 as u64) <= 0u64 is TRUE — this will
    // NOT fail locally. This test documents the limitation: expiry-based failure
    // requires a live network with block.height > 0.
    // The @should_fail annotation captures the INTENT; if leo test runs at
    // height=0 this test will itself fail (which IS the finding).
    @test
    @should_fail
    fn test_consume_shared_expired() -> Final {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 1u8,
            data: [111u128, 222u128, 333u128, 444u128],
            data_len: 64u32,
        };
        let r: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 11field, 0u64);
        let res: (pii_poc.aleo::SharedPIIRecord, Final) =
            pii_poc.aleo::consume_shared(r);
        return final {
            res.1.run();
        };
    }

    // -------------------------------------------------------------------------
    // revoke tests
    // -------------------------------------------------------------------------

    // R-01: revoke happy path — returns a Final (finalize sets mapping)
    @test
    fn test_revoke_ok() -> Final {
        let f: Final = pii_poc.aleo::revoke(77field);
        return final {
            f.run();
        };
    }

    // -------------------------------------------------------------------------
    // reveal tests (V3 standalone — within same program)
    // -------------------------------------------------------------------------

    // REV-01: reveal returns the payload struct by value
    @test
    fn test_reveal_ok() {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::PIIPayload {
            category: 7u8,
            data: [111u128, 222u128, 333u128, 444u128],
            data_len: 64u32,
        };
        let r: pii_poc.aleo::SharedPIIRecord =
            pii_poc.aleo::mint_share(payload, self.signer, 99field, 9999u64);

        let result: pii_poc.aleo::PIIPayload = pii_poc.aleo::reveal(r);
        assert_eq(result.category, 7u8);
        assert_eq(result.data[0], 111u128);
        assert_eq(result.data_len, 64u32);
    }
}
