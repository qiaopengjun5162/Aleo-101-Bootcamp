// The 'simple_token' program.
program simple_token.aleo {
    record Token {
        owner: address,
        amount: u64,
    }

    fn mint(owner: address, amount: u64) -> Token {
        return Token {
            owner: owner,
            amount: amount,
        };
    }

    fn transfer(token: Token, to: address, amount: u64) -> (Token, Token) {
        let difference: u64 = token.amount - amount;
        let remaining: Token = Token {
            owner: token.owner,
            amount: difference,
        };

        let transferred: Token = Token {
            owner: to,
            amount: amount,
        };

        return (remaining, transferred);
    }

    @noupgrade
    constructor() {}
}
