import { readFile, writeFile, mkdir } from "node:fs/promises";
import { checkRequest } from "../../lib/check.js";
import { loadState, note } from "../../public/trend.js";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const file = new URL("../../data/trend.json", import.meta.url);
let saved = { observations: [], marks: [] };
try {
  saved = loadState(JSON.parse(await readFile(file, "utf8"))) ?? saved;
} catch {
  saved = { observations: [], marks: [] };
}
const lang = arg("--lang") === "pt" ? "pt" : "en";
const rule = { count: arg("--count", "3"), direction: arg("--direction", "down"), minutes: arg("--minutes", "0") };
const out = await checkRequest({ ...rule, observations: saved.observations, lang });
if (out.ok) {
  const next = loadState({
    observations: out.observations,
    marks: note({ observations: out.observations, marks: saved.marks }, rule),
  });
  await mkdir(new URL("../../data/", import.meta.url), { recursive: true });
  await writeFile(file, `${JSON.stringify(next)}\n`);
}
console.log(out.headline || out.reason);
if (out.ok) {
  for (const row of out.observations) console.log(`${row.block}  ${row.price} USDC  ${row.at}`);
  console.log(`${out.decision} · ${out.reason}`);
  if (out.metAt) console.log(`met ${out.metAt.block} ${out.metAt.at}`);
}
