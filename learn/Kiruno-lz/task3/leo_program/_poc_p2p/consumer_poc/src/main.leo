// Program B: consumer_poc.aleo
// PoC cross-program consumer — imports pii_poc.aleo.
// NOT production code — throwaway research artifact.
//
// Syntax: Leo 4.x Final/final{} pattern (matches aleo_pii_protocol_v1 syntax).
//
// Probes:
//   V1 — if pii_poc.aleo/finalize_consume_shared asserts fail, do B's own
//         mapping writes (orders[order_id] = true) also roll back?
//   V2 — B passes A's record to A's own transition; B cannot declare A's
//         record type as its own input directly.
//   V3 — B calls pii_poc.aleo/reveal(shared) and reads result.category.

import pii_poc.aleo;

program consumer_poc.aleo {

    @noupgrade
    constructor() {}

    // -------------------------------------------------------------------------
    // Mappings
    // -------------------------------------------------------------------------

    // V1 probe: if A's finalize fails, this write must NOT persist.
    mapping orders: u64 => bool;

    // -------------------------------------------------------------------------
    // Transitions
    // -------------------------------------------------------------------------

    // V1 + V2 probe: place an order by consuming a SharedPIIRecord from pii_poc.
    // B calls A's consume_shared, composes A's Final inside B's own final block.
    // B also writes orders[order_id] = true in its own finalize.
    // If A's finalize assert fails (expired or revoked), the whole tx rolls back —
    // including B's orders write. That is the V1 atomicity question.
    //
    // Cross-program Final composition syntax attempt:
    //   The (_, a_final) tuple from pii_poc.aleo/consume_shared is a Final.
    //   We include it in B's final{} block alongside B's own finalize call.
    //   If Leo supports this, it proves V1 is testable at compile time.
    fn place_order(
        shared: pii_poc.aleo::SharedPIIRecord,
        order_id: u64,
    ) -> Final {
        // V2: B passes A's record to A's own transition — B cannot consume it directly.
        let (_, a_final): (pii_poc.aleo::SharedPIIRecord, Final) =
            pii_poc.aleo::consume_shared(shared);
        return final {
            // Await A's finalize. If this panics, B's write below must not persist.
            a_final.run();
            // B's own mapping write — V1 atomicity question: does this roll back?
            finalize_place_order(order_id);
        };
    }

    // V3 probe: call pii_poc.aleo/reveal and read the returned struct's fields.
    // If this compiles and executes, struct-return-across-programs works.
    fn read_category(shared: pii_poc.aleo::SharedPIIRecord) -> u8 {
        let payload: pii_poc.aleo::PIIPayload = pii_poc.aleo::reveal(shared);
        return payload.category;
    }
}

final fn finalize_place_order(order_id: u64) {
    Mapping::set(orders, order_id, true);
}
