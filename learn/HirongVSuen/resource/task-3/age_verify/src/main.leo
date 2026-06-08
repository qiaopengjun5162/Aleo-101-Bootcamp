// The 'age_verify' program.
// Verify whether a person is an adult (age >= threshold) without revealing their actual age.
program age_verify.aleo {
    fn verify_age(age: u8, threshold: u8) -> bool {
        return age >= threshold;
    }
}
