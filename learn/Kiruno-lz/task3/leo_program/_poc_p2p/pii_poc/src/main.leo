// Program A: pii_poc.aleo
// PoC for cross-program atomicity, record consumption, and struct return research.
// NOT production code — throwaway research artifact.
//
// Syntax: Leo 4.x Final/final{} pattern (matches aleo_pii_protocol_v1 syntax).
//
// Probes:
//   V1 — finalize atomicity (does A's assert failure roll back B's mapping writes?)
//   V2 — record consumption pattern (B passes A's record to A's own transition)
//   V3 — struct return across programs (can B read fields of A's returned struct?)

program pii_poc.aleo {

    @noupgrade
    constructor() {}

    // -------------------------------------------------------------------------
    // Data types
    // -------------------------------------------------------------------------

    struct PIIPayload {
        category: u8,
        data: [u128; 4],
        data_len: u32,
    }

    record SharedPIIRecord {
        owner: address,
        payload: PIIPayload,
        share_id: field,
        expires_at: u64,
    }

    // -------------------------------------------------------------------------
    // Mappings
    // -------------------------------------------------------------------------

    mapping revoked: field => bool;

    // -------------------------------------------------------------------------
    // Transitions
    // -------------------------------------------------------------------------

    // Setup helper: mint a SharedPIIRecord owned by `recipient`.
    // For test setup, caller passes recipient = self.signer so the same key
    // can later call consume_shared (record owner must match signer).
    fn mint_share(
        payload: PIIPayload,
        recipient: address,
        share_id: field,
        expires_at: u64,
    ) -> SharedPIIRecord {
        return SharedPIIRecord {
            owner: recipient,
            payload: payload,
            share_id: share_id,
            expires_at: expires_at,
        };
    }

    // V1 + V2 probe: consume a SharedPIIRecord.
    // Re-mints a fresh record back to the original owner so the record can be
    // reused in tests (owner stays the same, share_id stays the same).
    // Finalize asserts: (a) not expired, (b) not revoked.
    // If either assert fails the ENTIRE composed transaction must roll back —
    // that is the V1 atomicity question.
    fn consume_shared(shared: SharedPIIRecord) -> (SharedPIIRecord, Final) {
        let fresh: SharedPIIRecord = SharedPIIRecord {
            owner: shared.owner,
            payload: shared.payload,
            share_id: shared.share_id,
            expires_at: shared.expires_at,
        };
        // Extract fields before final block — records cannot be captured in finalize.
        let sid: field = shared.share_id;
        let exp: u64 = shared.expires_at;
        return (
            fresh,
            final {
                finalize_consume_shared(sid, exp);
            },
        );
    }

    // Revoke a share by share_id.
    fn revoke(share_id: field) -> Final {
        return final {
            finalize_revoke(share_id);
        };
    }

    // V3 probe: return a struct (not a record) by value.
    // Question: can calling program B read result.category?
    fn reveal(shared: SharedPIIRecord) -> PIIPayload {
        return shared.payload;
    }
}

final fn finalize_consume_shared(share_id: field, expires_at: u64) {
    // Assert not expired
    assert((block.height as u64) <= expires_at);
    // Assert not revoked
    let is_revoked: bool = Mapping::get_or_use(revoked, share_id, false);
    assert_eq(is_revoked, false);
}

final fn finalize_revoke(share_id: field) {
    Mapping::set(revoked, share_id, true);
}
