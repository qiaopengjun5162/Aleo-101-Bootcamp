# ⚡ ZK Treasure Hunt — Marauder's Map

A Zero-Knowledge proof demo game built with **Leo (Aleo)** and vanilla HTML/CSS/JS.

## How It Works

1. A treasure is secretly placed on a 5×5 grid
2. You have **5 attempts** to find it by clicking cells
3. Each guess generates a **ZK proof** that verifies hit/miss — without ever revealing where the treasure is hidden
4. The treasure location is only revealed when you win or run out of attempts

## ZK Property

> The proof confirms your guess was checked fairly.  
> The treasure coordinates are **never exposed** — only the boolean result (hit/miss) is public.

---

## Run the Frontend

Just open `index.html` in any browser — no server needed:

```bash
open index.html
# or
python3 -m http.server 8080  # then visit http://localhost:8080
```

---

## Run the Leo Program

### Prerequisites
```bash
curl -L https://install.aleo.org | sh
leo --version
```

### Build & Test
```bash
cd leo/
leo build
```

### Execute transitions

**Game master hides treasure at (2, 3) with salt:**
```bash
leo run hide_treasure 2u8 3u8 987654321u64
```

**Player guesses (2, 3):**
```bash
# Returns true (hit) or false (miss) — treasure coords stay private
leo run verify_guess \
  '{owner: aleo1..., x: 2u8, y: 3u8, salt: 987654321u64, commitment: 123field}' \
  aleo1...player_address \
  2u8 3u8
```

---

## File Structure

```
treasure-hunt/
├── index.html          ← Complete frontend (Harry Potter theme)
├── README.md
└── leo/
    ├── program.json
    └── src/
        └── main.leo    ← Leo ZK program
```

---

## Stack

| Layer    | Tech |
|----------|------|
| ZK Layer | Leo language · Aleo blockchain |
| Frontend | HTML · CSS · Vanilla JS |
| Fonts    | Google Fonts (Cinzel Decorative, Crimson Text) |
| Proof    | Mock simulation in browser (Groth16 in production) |
