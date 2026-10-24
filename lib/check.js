import { readPrice } from "./chain.js";
import { append, fail, parseRule, review, sanitize } from "../public/trend.js";

export async function checkRequest({ count, direction, observations, lang = "en" }) {
  const rule = parseRule(count, direction);
  if (!rule) return fail("badRule", lang);
  const history = sanitize(observations ?? []);
  if (!history) return fail("badHistory", lang);
  try {
    const reading = await readPrice();
    const next = append(history, reading);
    return { ...review(next, rule, lang), added: next.length !== history.length };
  } catch {
    return fail("unread", lang);
  }
}
