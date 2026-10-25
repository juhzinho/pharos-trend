import { readPrice } from "./chain.js";
import { append, fail, parseRule, review, sanitize } from "../public/trend.js";

export async function checkRequest({ count, direction, minutes, observations, lang = "en" }, read = readPrice) {
  const rule = parseRule(count, direction, minutes);
  if (!rule) return fail("badRule", lang);
  const history = sanitize(observations ?? []);
  if (!history) return fail("badHistory", lang);
  try {
    const reading = sanitize([await read()]);
    if (!reading) return fail("unread", lang);
    const next = append(history, reading[0]);
    return { ...review(next, rule, lang), added: next.length !== history.length };
  } catch {
    return fail("unread", lang);
  }
}
