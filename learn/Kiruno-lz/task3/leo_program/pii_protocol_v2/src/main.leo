program pii_protocol_v2.aleo {

    // ──────────────────────────────────────────────────────────────────────────
    // Constructor (v2 removes @noupgrade to allow upgradeability)
    // ──────────────────────────────────────────────────────────────────────────
    // v2 uses @admin constructor which allows program upgrades by admin.
    // For testnet MVP, admin is the deployer key.
    // TODO: Replace with multisig/governance before production. Current design
    // is a centralization point suitable only for testnet MVP phase.
    @admin(address = "aleo1wvvr6t7k6r398qer5f4megt8hutw5k0emtxe59f3u7x9fkxx7s9sdcds3m")
    constructor() {
        // Admin-controlled upgrade validation.
        // Production must replace with governance mechanism.
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Category constants (authoritative numbering, see 02-data-model §2.0)
    // ──────────────────────────────────────────────────────────────────────────
    const CATEGORY_RESERVED: u8 = 0u8;
    const CATEGORY_ADDRESS:   u8 = 1u8;
    const CATEGORY_NAME:      u8 = 2u8;
    const CATEGORY_PHONE:     u8 = 3u8;
    const CATEGORY_EMAIL:     u8 = 4u8;
    const CATEGORY_CUSTOM:    u8 = 5u8;
    const CATEGORY_KYC:       u8 = 6u8;

    // ──────────────────────────────────────────────────────────────────────────
    // Struct: PII data payload
    // ──────────────────────────────────────────────────────────────────────────
    struct PIIPayload {
        category: u8,          // See category constants (0=reserved/invalid)
        label_lo: u128,        // Label low 16 bytes (UTF-8 little-endian packed)
        label_hi: u128,        // Label high 16 bytes
        data: [u128; 13],      // Main data, 208 bytes capacity
        data_len: u32,         // Actual valid byte count
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Record: User-owned PII entry
    // ──────────────────────────────────────────────────────────────────────────
    record PIIRecord {
        owner: address,
        payload: PIIPayload,
        version: u8,           // v2 = 2u8
        created_at: u64,
        nonce: field,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Record: Shared PII copy for third party
    // ──────────────────────────────────────────────────────────────────────────
    record SharedPIIRecord {
        owner: address,        // Recipient address (triggers protocol auto-encryption)
        payload: PIIPayload,
        sender: address,       // self.caller (calling program address)
        share_id: field,       // Commitment hash, mapping key (see §2.3.1)
        shared_at: u64,
        expires_at: u64,
        purpose: u128,
        requested_category: u8,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Record: Share receipt (data subject holds, for enumeration/revocation)
    // ──────────────────────────────────────────────────────────────────────────
    record ShareReceipt {
        owner: address,        // Data subject (self.signer)
        share_id: field,
        recipient: address,
        purpose: u128,
        expires_at: u64,
        shared_category: u8,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Record: On-chain attestation (C-model, verify_* output)
    // ──────────────────────────────────────────────────────────────────────────
    record Attestation {
        owner: address,        // Recipient dApp address
        share_id: field,
        predicate_result: bool,
        expires_at: u64,
        attested_category: u8,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Mapping: Revocation list
    // ──────────────────────────────────────────────────────────────────────────
    mapping revoked: field => bool;   // share_id => true means revoked

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 1: create_pii
    // ──────────────────────────────────────────────────────────────────────────
    fn create_pii(
        payload: PIIPayload,
        nonce: field,
        version: u8,
        created_at: u64,
    ) -> PIIRecord {
        assert(payload.data_len <= 208u32);
        assert(payload.category != 0u8);
        assert_eq(version, 2u8);
        return PIIRecord {
            owner: self.signer,
            payload: payload,
            version: version,
            created_at: created_at,
            nonce: nonce,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 2: update_pii
    // ──────────────────────────────────────────────────────────────────────────
    fn update_pii(
        old: PIIRecord,
        new_payload: PIIPayload,
        new_nonce: field,
        updated_at: u64,
    ) -> PIIRecord {
        assert(new_payload.data_len <= 208u32);
        assert_eq(new_payload.category, old.payload.category);
        return PIIRecord {
            owner: self.signer,
            payload: new_payload,
            version: old.version,
            created_at: old.created_at,
            nonce: new_nonce,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 3: delete_pii
    // ──────────────────────────────────────────────────────────────────────────
    fn delete_pii(target: PIIRecord) {
        // Consume only — target PIIRecord is consumed as input, no output produced
        return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 4: share (single-record authorization)
    // ──────────────────────────────────────────────────────────────────────────
    fn share(
        source: PIIRecord,
        recipient: address,
        expires_at: u64,
        purpose: u128,
        share_id: field,
        requested_category: u8,
        new_nonce: field,
        shared_at: u64,
    ) -> (PIIRecord, SharedPIIRecord, ShareReceipt) {
        assert(expires_at > shared_at);
        assert(purpose != 0u128);
        assert_neq(recipient, self.signer);
        assert_eq(requested_category, source.payload.category);

        let kept: PIIRecord = PIIRecord {
            owner: self.signer,
            payload: source.payload,
            version: source.version,
            created_at: source.created_at,
            nonce: new_nonce,
        };

        let shared: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source.payload,
            sender: self.caller,
            share_id: share_id,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
            requested_category: requested_category,
        };

        let receipt: ShareReceipt = ShareReceipt {
            owner: self.signer,
            share_id: share_id,
            recipient: recipient,
            purpose: purpose,
            expires_at: expires_at,
            shared_category: requested_category,
        };

        return (kept, shared, receipt);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 5: share_bundle (atomic multi-record sharing, N=4)
    // ──────────────────────────────────────────────────────────────────────────
    // Leo 4.0.2 constraint: arrays cannot contain records (ETYC0372079).
    // Workaround: use individual parameters instead of arrays.
    fn share_bundle(
        source0: PIIRecord,
        source1: PIIRecord,
        source2: PIIRecord,
        source3: PIIRecord,
        recipient: address,
        expires_at: u64,
        purpose: u128,
        new_nonce0: field,
        new_nonce1: field,
        new_nonce2: field,
        new_nonce3: field,
        shared_at: u64,
        share_id0: field,
        share_id1: field,
        share_id2: field,
        share_id3: field,
    ) -> (PIIRecord, PIIRecord, PIIRecord, PIIRecord, SharedPIIRecord, SharedPIIRecord, SharedPIIRecord, SharedPIIRecord, ShareReceipt, ShareReceipt, ShareReceipt, ShareReceipt) {
        // Common assertions (same as single share)
        assert(expires_at > shared_at);
        assert(purpose != 0u128);
        assert_neq(recipient, self.signer);

        // Process first record
        let kept0: PIIRecord = PIIRecord {
            owner: self.signer,
            payload: source0.payload,
            version: source0.version,
            created_at: source0.created_at,
            nonce: new_nonce0,
        };
        let shared0: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source0.payload,
            sender: self.caller,
            share_id: share_id0,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
            requested_category: source0.payload.category,
        };
        let receipt0: ShareReceipt = ShareReceipt {
            owner: self.signer,
            share_id: share_id0,
            recipient: recipient,
            purpose: purpose,
            expires_at: expires_at,
            shared_category: source0.payload.category,
        };

        // Process second record
        let kept1: PIIRecord = PIIRecord {
            owner: self.signer,
            payload: source1.payload,
            version: source1.version,
            created_at: source1.created_at,
            nonce: new_nonce1,
        };
        let shared1: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source1.payload,
            sender: self.caller,
            share_id: share_id1,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
            requested_category: source1.payload.category,
        };
        let receipt1: ShareReceipt = ShareReceipt {
            owner: self.signer,
            share_id: share_id1,
            recipient: recipient,
            purpose: purpose,
            expires_at: expires_at,
            shared_category: source1.payload.category,
        };

        // Process third record
        let kept2: PIIRecord = PIIRecord {
            owner: self.signer,
            payload: source2.payload,
            version: source2.version,
            created_at: source2.created_at,
            nonce: new_nonce2,
        };
        let shared2: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source2.payload,
            sender: self.caller,
            share_id: share_id2,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
            requested_category: source2.payload.category,
        };
        let receipt2: ShareReceipt = ShareReceipt {
            owner: self.signer,
            share_id: share_id2,
            recipient: recipient,
            purpose: purpose,
            expires_at: expires_at,
            shared_category: source2.payload.category,
        };

        // Process fourth record
        let kept3: PIIRecord = PIIRecord {
            owner: self.signer,
            payload: source3.payload,
            version: source3.version,
            created_at: source3.created_at,
            nonce: new_nonce3,
        };
        let shared3: SharedPIIRecord = SharedPIIRecord {
            owner: recipient,
            payload: source3.payload,
            sender: self.caller,
            share_id: share_id3,
            shared_at: shared_at,
            expires_at: expires_at,
            purpose: purpose,
            requested_category: source3.payload.category,
        };
        let receipt3: ShareReceipt = ShareReceipt {
            owner: self.signer,
            share_id: share_id3,
            recipient: recipient,
            purpose: purpose,
            expires_at: expires_at,
            shared_category: source3.payload.category,
        };

        return (kept0, kept1, kept2, kept3, shared0, shared1, shared2, shared3, receipt0, receipt1, receipt2, receipt3);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 6: consume_shared (B-model consumption, with re-mint)
    // ──────────────────────────────────────────────────────────────────────────
    fn consume_shared(shared: SharedPIIRecord) -> (SharedPIIRecord, Final) {
        // Extract scalars (L-02: final{} cannot capture record)
        let expires: u64 = shared.expires_at;
        let sid: field = shared.share_id;

        // Re-mint to recipient (can continue using until expired)
        let new_shared: SharedPIIRecord = SharedPIIRecord {
            owner: shared.owner,
            payload: shared.payload,
            sender: shared.sender,
            share_id: shared.share_id,
            shared_at: shared.shared_at,
            expires_at: shared.expires_at,
            purpose: shared.purpose,
            requested_category: shared.requested_category,
        };

        return (new_shared, final { finalize_consume_shared(expires, sid); });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 7: reveal (B-model plaintext delivery)
    // ──────────────────────────────────────────────────────────────────────────
    fn reveal(shared: SharedPIIRecord) -> PIIPayload {
        return shared.payload;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 8: revoke (data subject revokes single authorization)
    // ──────────────────────────────────────────────────────────────────────────
    fn revoke(receipt: ShareReceipt) -> Final {
        let sid: field = receipt.share_id;
        return final { finalize_revoke(sid); };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 9: verify_age_gt (C-model example: age verification)
    // ──────────────────────────────────────────────────────────────────────────
    fn verify_age_gt(
        shared: SharedPIIRecord,
        threshold_age: u8,
        share_id: field,
        expires_at: u64,
        current_block_height: u32,
    ) -> Attestation {
        // Assert category is KYC (6u8)
        assert_eq(shared.payload.category, 6u8);

        // Extract birth_date from data[0] low 32 bits
        // Encoding convention: data[0] = birth_date (u32, YYYYMMDD format) in low bits
        let birth_u128: u128 = shared.payload.data[0u32];
        let birth_date: u32 = (birth_u128 & 0xFFFFFFFFu128) as u32;

        // Compute age (DEMO-level approximation using block.height passed as parameter)
        // Aleo testnet: ~10s per block, ~8640 blocks/day
        // Anchor: assume block 0 = 2026-01-01 (20260101)
        // Current date ≈ 20260101 + (current_block_height / 8640)
        // NOTE: This is a DEMO-level age check. Production needs proper oracle
        // or off-chain timestamp verification. block.height-based date is imprecise.
        // Client must pass block.height as parameter since it cannot be accessed in transition.
        let genesis_date: u32 = 20260101u32;
        let days_since_genesis: u32 = current_block_height / 8640u32;
        let current_date_approx: u32 = genesis_date + days_since_genesis;

        // Extract years from YYYYMMDD format
        let birth_year: u32 = birth_date / 10000u32;
        let current_year: u32 = current_date_approx / 10000u32;

        // Compute age (year difference, ignoring month/day for simplicity)
        let age_approx: u32 = current_year - birth_year;

        // Assert age >= threshold
        assert(age_approx >= (threshold_age as u32));

        // Output Attestation record
        // NOTE: owner is self.signer (not self.caller) to ensure the attestation
        // is owned by the transaction signer (user or dApp), not an intermediate program.
        return Attestation {
            owner: self.signer,
            share_id: share_id,
            predicate_result: true,
            expires_at: expires_at,
            attested_category: 6u8,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transition 10: consume_attestation (C-model consumption)
    // ──────────────────────────────────────────────────────────────────────────
    fn consume_attestation(att: Attestation) -> Final {
        assert(att.predicate_result);
        let expires: u64 = att.expires_at;
        let sid: field = att.share_id;
        return final { finalize_consume_attestation(expires, sid); };
    }

}

// ──────────────────────────────────────────────────────────────────────────────
// Finalize functions (top-level, outside program block per Leo 4.0.2 syntax)
// ──────────────────────────────────────────────────────────────────────────────

final fn finalize_consume_shared(expires_at: u64, share_id: field) {
    assert((block.height as u64) <= expires_at);
    assert(!Mapping::get_or_use(revoked, share_id, false));
}

final fn finalize_revoke(share_id: field) {
    Mapping::set(revoked, share_id, true);
}

final fn finalize_consume_attestation(expires_at: u64, share_id: field) {
    assert((block.height as u64) <= expires_at);
    assert(!Mapping::get_or_use(revoked, share_id, false));
}
