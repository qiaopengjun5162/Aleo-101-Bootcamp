program private_counter.aleo {
    record Counter {
        owner: address,
        count: u64,
    }

    @noupgrade
    constructor() {}

    fn new_counter() -> Counter {
        return Counter {
            owner: self.signer,
            count: 0u64,
        };
    }

    fn increment(counter: Counter, amount: u64) -> Counter {
        assert_eq(counter.owner, self.signer);

        return Counter {
            owner: counter.owner,
            count: counter.count + amount,
        };
    }

    fn reveal(counter: Counter) -> u64 {
        assert_eq(counter.owner, self.signer);
        return counter.count;
    }
}
