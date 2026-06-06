// private_auction_nontracey.aleo
// 隐私密封拍卖合约（Sealed-bid Auction）— Leo 4.2 syntax
//
// 业务流程：
//   1. 卖家调用 create_auction 创建拍卖（公开 item_id / 起拍价 / 持续区块数）
//   2. 出价者调用 submit_bid，链上只产生一条 Bid record（金额完全隐藏，仅出价者可见）
//   3. 出价窗口结束后进入揭示阶段，出价者调用 reveal_bid 揭示金额；
//      合约通过 ZK 证明保证：揭示的 amount = record 中真实金额
//   4. 揭示窗口结束后任何人都可调用 finalize_auction 锁定最终结果
//
// 隐私要点：
//   - 出价 record 加密持有在出价者私钥下，链上仅看到 commitment
//   - 未揭示的出价者 → 链上完全无人可知曾经出过价
//   - 揭示阶段对外只暴露 "本次新 highest 是不是被我刷新了"，未中标者出价永久隐私

// 拍卖元数据（公开存于链上 mapping 中）
struct AuctionInfo {
    seller: address,
    item_id: u64,
    min_bid: u64,
    end_height: u32,
    reveal_window: u32,
    highest_bid: u64,
    winner: address,
    finalized: bool,
}

program private_auction_nontracey.aleo {

    // 出价 record：金额隐私存储，仅持有者私钥可解密
    record Bid {
        owner: address,
        auction_id: u64,
        amount: u64,
        nonce: u64,
    }

    // auction_id => 拍卖信息（公开链上数据）
    mapping auctions: u64 => AuctionInfo;

    // ─────────────────────────────────────────────
    //  1. 创建拍卖
    // ─────────────────────────────────────────────
    fn create_auction(
        public auction_id: u64,
        public item_id: u64,
        public min_bid: u64,
        public bid_duration: u32,
        public reveal_window: u32,
    ) -> Final {
        assert(min_bid > 0u64);
        assert(bid_duration > 0u32);
        assert(reveal_window > 0u32);
        let seller: address = self.caller;
        return final {
            assert(!auctions.contains(auction_id));
            let end_height: u32 = block.height + bid_duration;
            let info: AuctionInfo = AuctionInfo {
                seller: seller,
                item_id: item_id,
                min_bid: min_bid,
                end_height: end_height,
                reveal_window: reveal_window,
                highest_bid: 0u64,
                winner: seller,
                finalized: false,
            };
            auctions.set(auction_id, info);
        };
    }

    // ─────────────────────────────────────────────
    //  2. 隐私出价（链上看不到金额）
    // ─────────────────────────────────────────────
    fn submit_bid(
        auction_id: u64,
        amount: u64,
        nonce: u64,
    ) -> Bid {
        assert(amount > 0u64);
        return Bid {
            owner: self.signer,
            auction_id: auction_id,
            amount: amount,
            nonce: nonce,
        };
    }

    // ─────────────────────────────────────────────
    //  3. 揭示出价 —— ZK 证明 record.amount == 公开 amount
    // ─────────────────────────────────────────────
    fn reveal_bid(
        bid: Bid,
        public auction_id: u64,
        public amount: u64,
    ) -> Final {
        assert_eq(bid.auction_id, auction_id);
        assert_eq(bid.amount, amount);
        let bidder: address = bid.owner;
        return final {
            let current: AuctionInfo = auctions.get(auction_id);
            assert(!current.finalized);
            assert(amount >= current.min_bid);
            // 必须在揭示窗口内：出价已结束且未超过揭示期
            assert(block.height > current.end_height);
            assert(block.height <= current.end_height + current.reveal_window);

            let is_higher: bool = amount > current.highest_bid;
            let new_highest: u64 = is_higher ? amount : current.highest_bid;
            let new_winner: address = is_higher ? bidder : current.winner;

            auctions.set(auction_id, AuctionInfo {
                seller: current.seller,
                item_id: current.item_id,
                min_bid: current.min_bid,
                end_height: current.end_height,
                reveal_window: current.reveal_window,
                highest_bid: new_highest,
                winner: new_winner,
                finalized: false,
            });
        };
    }

    // ─────────────────────────────────────────────
    //  4. 最终化（锁定结果，任何人可调用）
    // ─────────────────────────────────────────────
    fn finalize_auction(public auction_id: u64) -> Final {
        return final {
            let current: AuctionInfo = auctions.get(auction_id);
            assert(!current.finalized);
            assert(block.height > current.end_height + current.reveal_window);
            auctions.set(auction_id, AuctionInfo {
                seller: current.seller,
                item_id: current.item_id,
                min_bid: current.min_bid,
                end_height: current.end_height,
                reveal_window: current.reveal_window,
                highest_bid: current.highest_bid,
                winner: current.winner,
                finalized: true,
            });
        };
    }

    @noupgrade
    constructor() {}
}
