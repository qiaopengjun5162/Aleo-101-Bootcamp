program simple_counter.aleo;


mapping account_counter: address => u32;


function increment_counter:

    input r0 as address.private;

    async increment_counter r0 into r1;
    output r1 as simple_counter.aleo/increment_counter.future;


finalize increment_counter:
    input r0 as address.public;

    get.or_use account_counter[r0] 0u32 into r1;

    add r1 1u32 into r2;

    set r2 into account_counter[r0];
