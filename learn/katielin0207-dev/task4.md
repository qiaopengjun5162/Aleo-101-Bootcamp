# Task 4 - 部署到测试网

## 项目：ZK Treasure Hunt 🪄

基于 Task 3 的 ZK Treasure Hunt 项目，已成功部署到 **Aleo Testnet**。

**GitHub 仓库：** https://github.com/katielin0207-dev/zk-treasure-hunt

---

## 测试网部署信息

| 项目 | 内容 |
|------|------|
| **合约地址（Program ID）** | `treasure_hunt.aleo` |
| **部署网络** | Aleo Testnet |
| **部署者地址** | `aleo192xccjkqdp5c8lwjdp9ldky5egun3jrg4m2fh05r0tldq8cu9qqqv847yj` |
| **部署交易 TX** | `at1pedzdd4wcu26grecrujx888qktyvd0450fld0mv9lefwejej2cgqvhm70t` |
| **链上交互 TX** | `at12nhjcehhu9622r28new94e9wdzh3w35yn9agcx870f8gf5s9mc8qjjj4yr` |
| **Explorer** | https://testnet.explorer.provable.com/program/treasure_hunt.aleo |

---

## 链上交互说明

调用了 `hide_treasure` 函数，游戏主在坐标 `(2, 3)` 处秘密藏好宝藏：

```bash
leo execute hide_treasure 2u8 3u8 987654321u64 \
  --network testnet \
  --broadcast
```

**输出（ZK 证明保护私密坐标）：**
- HiddenTreasure record（私密，坐标不上链）
- commitment field（公开，用于验证游戏主未作弊）

---

## 合约代码（Leo 4.x）

```leo
program treasure_hunt.aleo {

    mapping attempts: address => u8;

    @noupgrade
    constructor() {}

    record HiddenTreasure {
        owner:      address,
        x:          u8,
        y:          u8,
        salt:       u64,
        commitment: field,
    }

    fn hide_treasure(
        private x:    u8,
        private y:    u8,
        private salt: u64,
    ) -> (HiddenTreasure, field) {
        assert(x < 5u8);
        assert(y < 5u8);
        let packed: u128 = (salt as u128)
            + ((x as u128) * 1_000_000u128)
            + ((y as u128) * 100_000_000u128);
        let commitment: field = BHP256::hash_to_field(packed);
        let treasure: HiddenTreasure = HiddenTreasure {
            owner: self.signer, x: x, y: y,
            salt: salt, commitment: commitment,
        };
        return (treasure, commitment);
    }

    fn verify_guess(
        treasure: HiddenTreasure,
        public  player:  address,
        private guess_x: u8,
        private guess_y: u8,
    ) -> (bool, Final) {
        assert(guess_x < 5u8);
        assert(guess_y < 5u8);
        let is_hit: bool = (treasure.x == guess_x) && (treasure.y == guess_y);
        return (is_hit, final { finalize_guess(player); });
    }

    final fn finalize_guess(player: address) {
        let used: u8 = Mapping::get_or_use(attempts, player, 0u8);
        assert(used < 5u8);
        Mapping::set(attempts, player, used + 1u8);
    }
}
```
