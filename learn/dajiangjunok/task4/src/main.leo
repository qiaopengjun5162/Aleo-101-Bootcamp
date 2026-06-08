program private_token_1lkp6q.aleo {
    record Token {
        owner: address,
        amount: u64,
    }

    @noupgrade
    constructor() {}

    fn mint_private(receiver: address, amount: u64) -> Token {
        return Token {
            owner: receiver,
            amount: amount,
        };
    }

    fn transfer_private(sender: Token, receiver: address, amount: u64) -> (Token, Token) {
        let remaining_amount: u64 = sender.amount - amount;

        let change: Token = Token {
            owner: sender.owner,
            amount: remaining_amount,
        };

        let payment: Token = Token {
            owner: receiver,
            amount: amount,
        };

        return (change, payment);
    }
}
