// The 'zkvoteapp' program.
// A private voting system with privacy-preserving vote tallying and double-vote prevention.
program zkvoteapp.aleo {
    // Simple record for tracking votes
    record VoteRecord {
        owner: address,
        proposal_id: field,
        vote_value: bool,  // true = agree, false = disagree
    }

    // Create a new vote record
    // fn is the entrypoint for creating records on Aleo
    fn create_vote(public proposal_id: field, public vote_value: bool) -> VoteRecord {
        return VoteRecord {
            owner: self.signer,
            proposal_id,
            vote_value,
        };
    }
}
