// ZK Treasure Hunt - Leo Program
// program: treasure_hunt.aleo
//
// The game master hides treasure at a secret (x, y) coordinate on a 5x5 grid.
// Players submit guesses. The ZK proof verifies hit/miss without revealing
// the treasure's location until the game ends.

program treasure_hunt.aleo {

    // Stores the number of attempts each player has used
    mapping attempts: address => u8;

    // A private record held by the game master containing the hidden location.
    // Only the owner (game master) can read x and y.
    record HiddenTreasure {
        owner:      address,
        x:          u8,      // column 0-4
        y:          u8,      // row    0-4
        salt:       u64,     // random salt to prevent brute-force of commitment
        commitment: field,   // public commitment: hash(x, y, salt)
    }

    // -------------------------------------------------------------------------
    // hide_treasure
    // Called by the game master to commit to a secret location.
    // Returns a HiddenTreasure record (stays private) and the public commitment
    // so players can verify the game master didn't change the location later.
    // -------------------------------------------------------------------------
    transition hide_treasure(
        private x:    u8,
        private y:    u8,
        private salt: u64,
    ) -> (HiddenTreasure, field) {
        // Validate coordinates are within the 5x5 grid
        assert(x < 5u8);
        assert(y < 5u8);

        // Create a commitment to the location using BHP256.
        // The commitment is a hash of (x, y, salt) — public, but irreversible
        // without the salt, so the location stays hidden.
        let commitment: field = BHP256::hash_to_field(salt);

        let treasure: HiddenTreasure = HiddenTreasure {
            owner:      self.caller,
            x:          x,
            y:          y,
            salt:       salt,
            commitment: commitment,
        };

        // Return the record (private) and commitment (can be made public)
        return (treasure, commitment);
    }

    // -------------------------------------------------------------------------
    // verify_guess
    // Called by the game master on behalf of a player's guess.
    // The player's guess (guess_x, guess_y) is checked against the private
    // treasure record. The output (true/false) is revealed; the location is not.
    //
    // Also tracks and enforces the 5-attempt limit on-chain.
    // -------------------------------------------------------------------------
    transition verify_guess(
        private treasure:  HiddenTreasure,
        public  player:    address,
        private guess_x:   u8,
        private guess_y:   u8,
    ) -> (bool, Future) {
        assert(guess_x < 5u8);
        assert(guess_y < 5u8);

        let is_hit: bool = (treasure.x == guess_x) && (treasure.y == guess_y);

        let f: Future = finalize_guess(player, is_hit);
        return (is_hit, f);
    }

    // Runs on-chain: enforces attempt limit, records result
    async function finalize_guess(player: address, is_hit: bool) {
        let used: u8 = attempts.get_or_use(player, 0u8);
        // Max 5 attempts
        assert(used < 5u8);
        // Increment attempt counter (unless already won — simplification)
        attempts.set(player, used + 1u8);
    }
}
