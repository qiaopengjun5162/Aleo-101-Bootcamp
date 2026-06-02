import private_vote.aleo;
program test_private_vote.aleo {
    @test
    fn test_cast_yes() {
        let (result, fresult): (private_vote.aleo::Vote, Final) = private_vote.aleo::cast_yes(aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        assert_eq(result.choice, 1u8);
    }

    @test
    fn test_cast_no() {
        let (result, fresult): (private_vote.aleo::Vote, Final) = private_vote.aleo::cast_no(aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        assert_eq(result.choice, 0u8);
    }

    @noupgrade
    constructor() {}
}
