// Core constants for private_gate_pass. Free of wallet-package imports so this
// module is safe from server routes and the browser alike.

export const PROGRAM_ID = "private_gate_pass.aleo";

// Network identifier for the @provablehq adaptor family (Network.TESTNET === "testnet").
export const NETWORK_NAME = "testnet";

// Cache-free public read host (the v1 explorer CDN caches stale 404s for fresh programs).
export const READ_API = "https://api.provable.com/v2/testnet";

// Human-facing explorer (testnet subdomain — mainnet would be explorer.provable.com).
export const EXPLORER_BASE = "https://testnet.explorer.provable.com";
export const EXPLORER_TX = `${EXPLORER_BASE}/transaction`;
export const EXPLORER_PROGRAM = `${EXPLORER_BASE}/program`;

// Suggested wallet fees (microcredits). Real measured costs are ~0.002 (issue) and
// ~0.004 (prove_access); ~1 credit is a comfortable ceiling the wallet asks to approve.
export const ISSUE_FEE_MICROCREDITS = 1_000_000;
export const PROVE_FEE_MICROCREDITS = 1_000_000;

// Demo scenario: an issuer grants tiered membership; gates require tier >= MIN.
export const DEMO_ISSUER_NAME = "Aleo Builders DAO";
export const DEMO_VALIDITY_DAYS = 365;

export type Gate = {
  name: string;
  emoji: string;
  issuer: string;
  minTier: number;
  blurb: string;
};

// Multiple gates with different bars — a Gold (tier 3) credential clears the
// Members Club and the VIP Lounge, but not the Founders Room (needs tier 4).
export const GATES: Gate[] = [
  {
    name: "Members Club",
    emoji: "🌱",
    issuer: DEMO_ISSUER_NAME,
    minTier: 1,
    blurb: "任何在册会员",
  },
  {
    name: "VIP Lounge",
    emoji: "🛋️",
    issuer: DEMO_ISSUER_NAME,
    minTier: 2,
    blurb: "Silver 及以上",
  },
  {
    name: "Founders Room",
    emoji: "👑",
    issuer: DEMO_ISSUER_NAME,
    minTier: 4,
    blurb: "Platinum 及以上",
  },
];

// The featured gate (the one with real on-chain activity from the CLI demo).
export const DEMO_GATE_NAME = "VIP Lounge";
export const DEMO_MIN_TIER = 2;

export type Tier = { id: number; label: string };
export const TIERS: Tier[] = [
  { id: 1, label: "Bronze" },
  { id: 2, label: "Silver" },
  { id: 3, label: "Gold" },
  { id: 4, label: "Platinum" },
  { id: 5, label: "Diamond" },
];

export function tierLabel(id: number): string {
  return TIERS.find((t) => t.id === id)?.label ?? `tier ${id}`;
}
