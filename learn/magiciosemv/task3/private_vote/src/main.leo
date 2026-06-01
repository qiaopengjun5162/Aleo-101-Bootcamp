// The 'private_vote' program — privacy-preserving voting on Aleo.
// Each vote is a private record; only the public tally is visible on-chain.
program private_vote.aleo {
    @noupgrade
    constructor() {}

    // A private vote record — only the owner can see their choice.
    record Vote {
        owner: address,
        choice: u8,
    }

    // Public tally stored on-chain.
    mapping yes_count: field => u32;
    mapping no_count: field => u32;

    // Cast a yes vote — returns a private Vote record and finalizes the tally.
    fn cast_yes(public voter: address) -> (Vote, Final) {
        return (
            Vote { owner: voter, choice: 1u8 },
            final {
                let current: u32 = Mapping::get_or_use(yes_count, 0field, 0u32);
                Mapping::set(yes_count, 0field, current + 1u32);
            }
        );
    }

    // Cast a no vote — returns a private Vote record and finalizes the tally.
    fn cast_no(public voter: address) -> (Vote, Final) {
        return (
            Vote { owner: voter, choice: 0u8 },
            final {
                let current: u32 = Mapping::get_or_use(no_count, 0field, 0u32);
                Mapping::set(no_count, 0field, current + 1u32);
            }
        );
    }
}
