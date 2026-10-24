import assert from "node:assert/strict";
import test from "node:test";
import { buttonLabel, EXAMPLES } from "../public/examples.js";
import { append, moment, parseRule, review, runLength, sanitize } from "../public/trend.js";

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
  assert.deepEqual(parseRule("4", "up"), { count: 4, direction: "up" });
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
  assert.deepEqual(EXAMPLES.map((row) => buttonLabel(row, "en")), ["Down, 3 checks", "Down, 4 checks", "Up, 3 checks"]);
  assert.equal(buttonLabel(EXAMPLES[0], "pt"), "Queda, 3 leituras");
  assert.equal(moment("2026-10-24T02:25:00.000Z"), "2026-10-24 02:25:00 UTC");
});
