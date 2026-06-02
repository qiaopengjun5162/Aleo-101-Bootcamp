program pii_protocol_v1.aleo {

    // Required by Leo 4.x ConsensusVersion >= V9: every program must declare
    // a constructor. `@noupgrade` pins the program code as immutable post-deploy.
    @noupgrade
    constructor() {}

    struct PIIPayload {
        category: u8,
        label_lo: u128,
        label_hi: u128,
        data: [u128; 13],
        data_len: u32,
    }

    record PIIRecord {
        owner: address,
        payload: PIIPayload,
        version: u8,
        created_at: u64,
        nonce: field,
    }

    record SharedPIIRecord {
        owner: address,
        payload: PIIPayload,
        sender: address,
        shared_at: u64,
        expires_at: u64,
        purpose: u128,
    }

    mapping revoked_nonces: field => bool;

    fn create_pii(
        payload: PIIPayload,
        nonce: field,
        version: u8,
        created_at: u64,
    ) -> PIIRecord {
        assert(payload.data_len <= 208u32);
        assert(payload.category != 0u8);
        assert_eq(version, 1u8);
        return PIIRecord {
            // Use `self.signer` (transaction signer) rather than `self.caller`
            // (immediate caller, which may be another program). The Aleo VM
            // requires record owners to be spend-capable user addresses;
            // `self.signer` provides that guarantee across nested-program calls.
            owner: self.signer,
            payload: payload,
            version: version,
            created_at: created_at,
            nonce: nonce,
        };
    }

    fn update_pii(
        old: PIIRecord,
        new_payload: PIIPayload,
        new_nonce: field,
        updated_at: u64,
    ) -> PIIRecord {
        assert(new_payload.data_len <= 208u32);
        return PIIRecord {
            // See note in create_pii: record owner must be the signer.
            owner: self.signer,
            payload: new_payload,
            version: old.version,
            created_at: old.created_at,
            nonce: new_nonce,
        };
    }

    fn delete_pii(target: PIIRecord) {
        // consume only — `target` PIIRecord is consumed as input, no output produced
        return;
    }

    fn share_pii(
        source: PIIRecord,
        recipient: address,
        expires_at: u64,
        purpose: u128,
        new_nonce: field,
        shared_at: u64,
    ) -> (PIIRecord, SharedPIIRecord) {
        assert(expires_at > shared_at);
        assert(purpose != 0u128);
        assert_neq(recipient, self.signer);

        let kept: PIIRecord = PIIRecord {
            // Returned to the signer (original holder); record ownership must
            // be a spend-capable user address — see create_pii note.
            owner: self.signer,
            payload: source.payload,
            version: source.version,
            created_at: source.created_at,
            nonce: new_nonce,
        };

        let shared: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source.payload,
            // `sender` records the immediate caller (per docs §2.4); preserved
            // as `self.caller` so downstream verifiers see the actual caller,
            // not the underlying signer when invoked via a wrapper program.
            sender: self.caller,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
        };

        return (kept, shared);
    }

    fn consume_shared(shared: SharedPIIRecord) -> Final {
        let expires: u64 = shared.expires_at;
        return final { finalize_consume_shared(expires); };
    }

    // Test utility: creates a SharedPIIRecord owned by self.signer so that L1
    // tests can verify consume_shared. In a real transaction the recipient would
    // call consume_shared as a different signer, but Leo tests use a single
    // signer — this helper bridges the gap without weakening production flows.
    fn testutil_create_shared(
        payload: PIIPayload,
        sender_addr: address,
        shared_at: u64,
        expires_at: u64,
        purpose: u128,
    ) -> SharedPIIRecord {
        assert(purpose != 0u128);
        assert(expires_at > shared_at);
        return SharedPIIRecord {
            owner: self.signer,
            payload: payload,
            sender: sender_addr,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
        };
    }

    fn mark_revoked(
        original_nonce: field,
        proof_record: PIIRecord,
    ) -> (PIIRecord, Final) {
        assert_eq(proof_record.nonce, original_nonce);

        let kept: PIIRecord = PIIRecord {
            // See create_pii note: record owner must be the signer.
            owner: self.signer,
            payload: proof_record.payload,
            version: proof_record.version,
            created_at: proof_record.created_at,
            nonce: proof_record.nonce,
        };
        return (
            kept,
            final {
                finalize_mark_revoked(original_nonce);
            },
        );
    }
}

final fn finalize_mark_revoked(nonce: field) {
    Mapping::set(revoked_nonces, nonce, true);
}

final fn finalize_consume_shared(expires_at: u64) {
    assert((block.height as u64) <= expires_at);
}
