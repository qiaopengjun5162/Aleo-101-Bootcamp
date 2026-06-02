// The `age_verify.aleo` program.
program age_verify.aleo {
    // A private record storing the user's age.
    // The age is kept private - only the owner can see it.
    record AgeRecord {
        owner: address,
        age: u8,
    }

    // Create a private age record.
    // The age value is stored as a private record on-chain (encrypted).
    // Only the owner can decrypt and read the actual age.
    transition create_age(public owner: address, private age: u8) -> AgeRecord {
        let record: AgeRecord = AgeRecord {
            owner: owner,
            age: age,
        };
        return record;
    }

    // Verify if the age in the record is >= 18.
    // This happens locally (off-chain) - the actual age is never revealed.
    // Returns true if age >= 18, false otherwise.
    transition verify(record: AgeRecord) -> bool {
        let is_adult: bool = record.age >= 18u8;
        return is_adult;
    }
}
