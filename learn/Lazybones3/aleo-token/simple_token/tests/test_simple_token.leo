// The 'test_simple_token' test program.
import simple_token.aleo;
program test_simple_token.aleo {
    @test
    fn test_mint() {
        // leo account new
        let recipient = aleo16qhh2slrgmarl57y095f0xlgfcnc362txt889qszg2ahfvxahv9sw09n8g;
        let token: simple_token.aleo::Token = simple_token.aleo::mint(recipient, 10u64);
        assert_eq(token.owner, recipient);
        assert_eq(token.amount, 10u64);
    }

    @test(private_key = "APrivateKey1zkp6Nj5pRcqiySymfPyuvhPSwSPd3jgvLCBF6VcoD9tSps7")
    fn test_transfer_success() {
        let sender: address = aleo1s4kumu0gzs3uvpav5rjp8k27fuqr0qf7c3prk7zs53sdq09t3qfqt08puu;
        let receiver: address = aleo1yccrt94v9rcu38zvsgrulnwmgve9gc85f5y8w05mhp52t3nhfq8qfvy2nj;
        
        let initial_token: simple_token.aleo::Token = simple_token.aleo::mint(sender, 100u64);

        let transfer_amount: u64 = 40u64;
        let (remaining, transferred): (simple_token.aleo::Token, simple_token.aleo::Token) = simple_token.aleo::transfer(initial_token, receiver, transfer_amount);

        // Verify sender's remaining change record
        assert_eq(remaining.owner, sender);
        assert_eq(remaining.amount, 60u64);

        // Verify receiver's new token record
        assert_eq(transferred.owner, receiver);
        assert_eq(transferred.amount, 40u64);
    }

    @noupgrade
    constructor() {}
}
