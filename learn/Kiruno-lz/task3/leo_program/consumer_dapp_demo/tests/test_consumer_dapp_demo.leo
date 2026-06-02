// The 'test_consumer_dapp_demo' test program.
import consumer_dapp_demo.aleo;
program test_consumer_dapp_demo.aleo {
    @test
    @should_fail
    fn test_main_fails() {
        let result: u32 = consumer_dapp_demo.aleo::main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    constructor() {}
}
