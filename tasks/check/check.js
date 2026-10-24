import { readFile, writeFile, mkdir } from "node:fs/promises";
import { checkRequest } from "../../lib/check.js";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const file = new URL("../../data/trend.json", import.meta.url);
let observations = [];
try {
  observations = JSON.parse(await readFile(file, "utf8"));
} catch {
  observations = [];
}
const lang = arg("--lang") === "pt" ? "pt" : "en";
const out = await checkRequest({
  count: arg("--count", "3"),
  direction: arg("--direction", "down"),
  observations,
  lang,
});
if (out.ok) {
  await mkdir(new URL("../../data/", import.meta.url), { recursive: true });
  await writeFile(file, `${JSON.stringify(out.observations)}\n`);
}
console.log(out.headline || out.reason);
if (out.ok) {
  for (const row of out.observations) console.log(`${row.block}  ${row.price} USDC  ${row.at}`);
  console.log(`${out.decision} · ${out.reason}`);
  if (out.metAt) console.log(`met ${out.metAt.block} ${out.metAt.at}`);
}
