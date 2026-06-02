const TESTNET_BLOCK_ENDPOINT =
  "https://api.explorer.provable.com/v1/testnet/block/height/latest";

export async function fetchLatestBlockHeight(): Promise<number> {
  try {
    const res = await fetch(TESTNET_BLOCK_ENDPOINT);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const raw = await res.text();
    const trimmed = raw.trim().replace(/^"|"$/g, "");
    const value = Number(trimmed);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
    throw new Error(`unparseable block height: ${raw}`);
  } catch {
    return Math.floor(Date.now() / 1000);
  }
}
