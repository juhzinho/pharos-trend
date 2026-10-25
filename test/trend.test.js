import assert from "node:assert/strict";
import test from "node:test";
import { buttonLabel, EXAMPLES } from "../public/examples.js";
import { append, journal, loadState, misses, missLine, moment, note, parseRule, review, runLength, sanitize, windowLine, windows } from "../public/trend.js";

function row(block, price) {
  return { block: String(block), price, at: "2026-10-24T02:25:00.000Z" };
}

function build(prices, rule) {
  let observations = [];
  prices.forEach((price, index) => {
    observations = append(observations, row(21080000 + index, price));
  });
  return review(observations, rule, "en");
}

test("the rule needs at least 3 checks", () => {
  assert.equal(parseRule("2", "down"), null);
  assert.equal(parseRule("3.5", "down"), null);
  assert.equal(parseRule("3", "sideways"), null);
  assert.deepEqual(parseRule("4", "up"), { count: 4, direction: "up", minutes: 0 });
  assert.equal(parseRule("3", "down", ""), null);
  assert.equal(parseRule("3", "down", "1441"), null);
  assert.equal(review([], { count: "2", direction: "down" }).ok, false);
});

test("one spike does not confirm the trend", () => {
  const out = build(["1.000000", "1.000000", "0.500000"], { count: "3", direction: "down" });
  assert.equal(out.decision, "wait");
  assert.equal(out.metAt, null);
  assert.equal(out.streak, 2);
  assert.match(out.reason, /not confirmed yet/);
});

test("a single stored check does not act", () => {
  const out = build(["0.650000"], { count: "3", direction: "down" });
  assert.equal(out.decision, "wait");
  assert.match(out.reason, /stands alone/);
  assert.match(out.reason, /does not confirm/);
});

test("a reversal after two downs does not act", () => {
  const out = build(["1.000000", "0.990000", "1.010000"], { count: "3", direction: "down" });
  assert.equal(out.decision, "wait");
  assert.equal(out.streak, 1);
  assert.match(out.reason, /broke the run/);
  assert.equal(out.metAt, null);
});

test("three downs confirm on the third check and keep that moment", () => {
  const first = build(["1.000000", "0.990000", "0.980000"], { count: "3", direction: "down" });
  assert.equal(first.decision, "act");
  assert.equal(first.metAt.block, "21080002");
  assert.equal(first.metAt.price, "0.980000");
  const longer = build(["1.000000", "0.990000", "0.980000", "0.970000"], { count: "3", direction: "down" });
  assert.equal(longer.decision, "act");
  assert.equal(longer.metAt.block, "21080002");
  assert.equal(longer.observations.length, 4);
});

test("raising the rule to 4 waits on a run of 3", () => {
  const out = build(["1.000000", "0.990000", "0.980000"], { count: "4", direction: "down" });
  assert.equal(out.decision, "wait");
  assert.equal(out.streak, 3);
  assert.equal(out.metAt, null);
});

test("an up rule ignores a down run", () => {
  const out = build(["1.000000", "0.990000", "0.980000"], { count: "3", direction: "up" });
  assert.equal(out.decision, "wait");
  assert.equal(out.streak, 1);
});

test("three ups confirm", () => {
  const out = build(["1.000000", "1.010000", "1.020000"], { count: "3", direction: "up" });
  assert.equal(out.decision, "act");
  assert.equal(out.metAt.block, "21080002");
});

test("a restart keeps the history and does not duplicate the same block", () => {
  const reading = row(21080010, "0.640000");
  const once = append([row(21080009, "0.650000")], reading);
  const twice = append(once, reading);
  assert.equal(twice.length, 2);
  assert.equal(twice[0].block, "21080009");
  const saved = JSON.parse(JSON.stringify(twice));
  const again = review(saved, { count: "3", direction: "down" }, "en");
  assert.equal(again.observations.length, 2);
  assert.equal(again.decision, "wait");
  assert.equal(runLength(saved, "down"), 2);
});

test("a broken history is rejected", () => {
  assert.equal(sanitize([{ block: "2", price: "1.000000", at: "2026-10-24T02:25:00.000Z" }, { block: "2", price: "1.000000", at: "2026-10-24T02:25:00.000Z" }]), null);
  assert.equal(sanitize([{ block: "2", price: "1.0", at: "2026-10-24T02:25:00.000Z" }]), null);
});

test("example buttons name the rule they fill", () => {
  assert.deepEqual(EXAMPLES.map((row) => buttonLabel(row, "en")), [
    "Down, 3 checks, 0 min",
    "Down, 4 checks, 0 min",
    "Up, 3 checks, 0 min",
    "Down, 3 checks, 120 min",
  ]);
  assert.equal(buttonLabel(EXAMPLES[0], "pt"), "Queda, 3 leituras, 0 min");
  assert.equal(moment("2026-10-24T02:25:00.000Z"), "2026-10-24 02:25:00 UTC");
});

test("a later reversal keeps the moment the rule was met", () => {
  const rule = { count: "3", direction: "down", minutes: "0" };
  let observations = [];
  ["1.000000", "0.990000", "0.980000", "1.020000"].forEach((price, index) => {
    observations = append(observations, row(21080000 + index, price));
  });
  const before = review(observations.slice(0, 3), rule);
  const marks = note({ observations: observations.slice(0, 3), marks: [] }, rule);
  const after = review(observations, rule);
  const kept = note({ observations, marks }, rule);
  assert.equal(before.decision, "act");
  assert.equal(after.decision, "wait");
  assert.equal(after.metAt, null);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].block, "21080002");
  const loaded = loadState(JSON.parse(JSON.stringify({ observations, marks: kept })));
  assert.equal(loaded.marks[0].block, "21080002");
  assert.equal(loaded.observations.length, 4);
});

test("three quick checks do not satisfy a 120 minute rule", () => {
  const observations = [0, 1, 2].map((index) => ({
    block: String(21080000 + index),
    price: ["1.000000", "0.990000", "0.980000"][index],
    at: `2026-10-24T02:0${index}:00.000Z`,
  }));
  const out = review(observations, { count: "3", direction: "down", minutes: "120" });
  assert.equal(out.decision, "wait");
  assert.equal(out.metAt, null);
  assert.match(out.reason, /120 minutes/);
});

test("three checks spread over two hours confirm on the later check", () => {
  const observations = ["2026-10-24T00:00:00.000Z", "2026-10-24T01:00:00.000Z", "2026-10-24T02:00:00.000Z"].map((at, index) => ({
    block: String(21080000 + index),
    price: ["1.000000", "0.990000", "0.980000"][index],
    at,
  }));
  const out = review(observations, { count: "3", direction: "down", minutes: "120" });
  assert.equal(out.decision, "act");
  assert.equal(out.metAt.block, "21080002");
});

test("a spike is named and does not lock, and three downs lock once", () => {
  const rule = { count: "3", direction: "down", minutes: "0" };
  const spike = ["1.000000", "0.900000", "1.100000"].map((price, index) => row(21080100 + index, price));
  const named = journal(spike, rule, []);
  assert.deepEqual(named.rows.map((row) => row.role), ["open", "step", "spike"]);
  assert.equal(named.decision, "wait");
  const downs = ["1.000000", "0.990000", "0.980000", "0.970000"].map((price, index) => row(21080200 + index, price));
  const locked = journal(downs, rule, []);
  assert.deepEqual(locked.rows.map((row) => row.role), ["open", "step", "lock", "step"]);
  const marks = note({ observations: downs.slice(0, 3), marks: [] }, rule);
  const broken = journal([...downs.slice(0, 3), row(21080203, "1.050000")], rule, marks);
  assert.equal(broken.rows[2].role, "lock");
  assert.equal(broken.rows[3].role, "spike");
  assert.equal(broken.decision, "wait");
});

test("a confirmed run freezes and a later check stays outside it", () => {
  const rule = { count: "3", direction: "down", minutes: "0" };
  const prices = ["1.000000", "0.990000", "0.980000", "0.970000", "1.050000"];
  const observations = prices.map((price, index) => row(21080300 + index, price));
  const marks = note({ observations: observations.slice(0, 3), marks: [] }, rule);
  assert.equal(marks[0].from, "21080300");
  assert.equal(marks[0].block, "21080302");
  const panes = windows(observations, rule, marks);
  assert.equal(panes.length, 1);
  assert.deepEqual(panes[0].rows.map((item) => item.block), ["21080300", "21080301", "21080302"]);
  assert.equal(panes[0].minutes, 0);
  assert.match(windowLine(panes[0], "en"), /Frozen from block 21080300 to block 21080302/);
  assert.match(windowLine(panes[0], "pt"), /Janela travada do bloco 21080300 ao bloco 21080302/);
  const named = journal(observations, rule, marks);
  assert.deepEqual(named.rows.map((item) => item.held), [true, true, true, false, false]);
  assert.equal(named.rows[2].role, "lock");
  assert.equal(named.rows[4].role, "spike");
  const loaded = loadState(JSON.parse(JSON.stringify({ observations, marks })));
  assert.equal(loaded.marks[0].from, "21080300");
  const rebuilt = windows(loaded.observations, rule, loaded.marks.map(({ from, ...mark }) => mark));
  assert.deepEqual(rebuilt[0].rows.map((item) => item.block), ["21080300", "21080301", "21080302"]);
});

test("two downs and a spike are kept as a broken run", () => {
  const rule = { count: "3", direction: "down", minutes: "0" };
  const observations = ["1.000000", "0.990000", "1.020000"].map((price, index) => row(21080400 + index, price));
  const broken = misses(observations, rule);
  assert.equal(broken.length, 1);
  assert.equal(broken[0].streak, 2);
  assert.equal(broken[0].block, "21080402");
  assert.equal(windows(observations, rule, []).length, 0);
  assert.match(missLine(broken[0], rule, "en"), /Stopped at block 21080402/);
  assert.match(missLine(broken[0], rule, "en"), /2 of 3/);
  assert.match(missLine(broken[0], rule, "pt"), /Parou no bloco 21080402/);
  assert.match(missLine(broken[0], rule, "pt"), /2 de 3/);
});

test("a short timed run is kept when a spike breaks it", () => {
  const rule = { count: "3", direction: "down", minutes: "120" };
  const observations = ["2026-10-24T00:00:00.000Z", "2026-10-24T00:01:00.000Z", "2026-10-24T00:02:00.000Z", "2026-10-24T00:03:00.000Z"].map((at, index) => ({
    block: String(21080500 + index),
    price: ["1.000000", "0.990000", "0.980000", "1.020000"][index],
    at,
  }));
  const broken = misses(observations, rule);
  assert.equal(broken.length, 1);
  assert.equal(broken[0].streak, 3);
  assert.equal(broken[0].covered, 2);
  assert.equal(broken[0].block, "21080503");
  assert.match(missLine(broken[0], rule, "en"), /2 of 120 minutes/);
  assert.equal(windows(observations, rule, []).length, 0);
});

test("an older saved list still loads", () => {
  const loaded = loadState([row(21080000, "0.650000")]);
  assert.equal(loaded.observations.length, 1);
  assert.deepEqual(loaded.marks, []);
});
