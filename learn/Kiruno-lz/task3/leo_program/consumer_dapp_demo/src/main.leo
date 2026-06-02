// Program: consumer_dapp_demo.aleo
// Demonstrates B-model and C-model cross-program calls to pii_protocol_v2.aleo
// Reference: docs/03-program-interface.md §2.7, docs/04-interop-standard.md

import pii_protocol_v2.aleo;

program consumer_dapp_demo.aleo {

    @noupgrade
    constructor() {}

    // ──────────────────────────────────────────────────────────────────────────
    // Mappings
    // ──────────────────────────────────────────────────────────────────────────

    // B-model: track order placements
    mapping orders: u64 => bool;

    // C-model: track age-verified accesses
    mapping accesses: u64 => bool;

    // ──────────────────────────────────────────────────────────────────────────
    // B-model Transition: place_order
    // ──────────────────────────────────────────────────────────────────────────
    // Demonstrates:
    // 1. Calling pii_protocol_v2.aleo::reveal to get PIIPayload struct
    // 2. Reading payload.category field (V3 confirmed in PoC)
    // 3. Calling pii_protocol_v2.aleo::consume_shared and composing its Final
    // 4. Finalize atomicity: if A's finalize fails, B's mapping write rolls back
    fn place_order(
        shared: pii_protocol_v2.aleo::SharedPIIRecord,
        order_id: u64,
    ) -> Final {
        // V3: struct return across programs (confirmed working)
        let payload: pii_protocol_v2.aleo::PIIPayload =
            pii_protocol_v2.aleo::reveal(shared);

        // Read category field (demo: could validate category == ADDRESS)
        let category: u8 = payload.category;

        // V2: pass A's record to A's own transition
        // consume_shared returns (SharedPIIRecord, Final)
        let (new_shared, a_final): (pii_protocol_v2.aleo::SharedPIIRecord, Final) =
            pii_protocol_v2.aleo::consume_shared(shared);

        // Extract scalars before final{} block (L-02 constraint)
        let oid: u64 = order_id;

        return final {
            // V1: await A's finalize. If it panics (expired/revoked), B's write rolls back
            a_final.run();
            // B's own mapping write
            finalize_place_order(oid);
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // C-model Transition: verify_age_access
    // ──────────────────────────────────────────────────────────────────────────
    // Demonstrates:
    // 1. Consuming an Attestation record from pii_protocol_v2.aleo::verify_age_gt
    // 2. Calling pii_protocol_v2.aleo::consume_attestation
    // 3. Composing A's Final in B's final{} block
    fn verify_age_access(
        att: pii_protocol_v2.aleo::Attestation,
        access_id: u64,
    ) -> Final {
        // Assert predicate result is true (age verification passed)
        assert(att.predicate_result);

        // Consume attestation via A's transition
        let a_final: Final = pii_protocol_v2.aleo::consume_attestation(att);

        // Extract scalars before final{} block (L-02 constraint)
        let aid: u64 = access_id;

        return final {
            // Await A's finalize (checks expiry and revocation)
            a_final.run();
            // B's own mapping write
            finalize_verify_age_access(aid);
        };
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Finalize functions (top-level, outside program block per Leo 4.0.2 syntax)
// ──────────────────────────────────────────────────────────────────────────────

final fn finalize_place_order(order_id: u64) {
    Mapping::set(orders, order_id, true);
}

final fn finalize_verify_age_access(access_id: u64) {
    Mapping::set(accesses, access_id, true);
}
