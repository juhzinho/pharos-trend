import { formatUnits, hex } from "./format.js";

const RPC = "https://rpc.pharos.xyz";
const POOL = "0x912c9ade24d44d8922f0866d8dcb079f1363f647";
const WPROS = "0x52c48d4213107b20bc583832b0d951fb9ca8f0b0";
const USDC = "0xc879c018db60520f4355c26ed1a6d572cdac1815";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rpc(method, params, attempt = 0) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    const message = body.error.message || "rpc";
    if (attempt < 3 && /too fast|cu limit|rate/i.test(message)) {
      await sleep(700 * (attempt + 1));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(message);
  }
  return body.result;
}

function word(value, index) {
  return BigInt(`0x${value.slice(2 + index * 64, 2 + (index + 1) * 64)}`);
}

function addressOf(value) {
  return `0x${value.slice(26, 66).toLowerCase()}`;
}

function spotUsdc6(sqrtPriceX96) {
  const sqrt = BigInt(sqrtPriceX96);
  return (sqrt * sqrt * 10n ** 18n) / 2n ** 192n;
}

export async function readPrice() {
  const block = BigInt(await rpc("eth_blockNumber", []));
  const tag = hex(block);
  await sleep(300);
  const header = await rpc("eth_getBlockByNumber", [tag, false]);
  await sleep(300);
  const slot0 = await rpc("eth_call", [{ to: POOL, data: "0x3850c7bd" }, tag]);
  await sleep(300);
  const token0 = await rpc("eth_call", [{ to: POOL, data: "0x0dfe1681" }, tag]);
  await sleep(300);
  const token1 = await rpc("eth_call", [{ to: POOL, data: "0xd21220a7" }, tag]);
  await sleep(300);
  const fee = await rpc("eth_call", [{ to: POOL, data: "0xddca3f43" }, tag]);
  if (addressOf(token0) !== WPROS || addressOf(token1) !== USDC) throw new Error("pool tokens");
  if (word(fee, 0) !== 100n) throw new Error("pool fee");
  const at = new Date(Number(BigInt(header.timestamp)) * 1000).toISOString();
  return {
    block: block.toString(),
    price: formatUnits(spotUsdc6(word(slot0, 0)), 6, 6),
    at,
  };
}
