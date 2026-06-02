import private_counter.aleo;

program test_private_counter.aleo {
    @test
    fn test_counter_flow() {
        let first: private_counter.aleo::Counter = private_counter.aleo::new_counter();
        let second: private_counter.aleo::Counter = private_counter.aleo::increment(first, 5u64);
        let value: u64 = private_counter.aleo::reveal(second);
        assert_eq(value, 5u64);
    }

    @noupgrade
    constructor() {}
}
