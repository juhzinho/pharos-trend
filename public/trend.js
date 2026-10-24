const PRICE = /^\d+\.\d{6}$/;
const BLOCK = /^\d+$/;
const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const TEXT = {
  en: {
    badRule: "The rule needs a whole number of checks, from 3 to 24, and a direction.",
    badHistory: "The stored history could not be read.",
    unread: "The pool could not be read.",
    empty: "No checks are stored yet.",
    alone: (count, direction) => `This check stands alone. One reading does not confirm the trend. The rule needs ${count} ${direction} checks in a row.`,
    broke: (count, direction) => `The latest check broke the run. One reading does not confirm the trend. The rule needs ${count} ${direction} checks in a row.`,
    short: (streak, count) => `The run is ${streak} of ${count}. It is not confirmed yet.`,
    act: (block, at, price) => `Confirmed at block ${block}, ${at}, price ${price} USDC.`,
    headWait: "Still waiting.",
    headAct: "The trend is confirmed.",
    down: "down",
    up: "up",
  },
  pt: {
    badRule: "A regra precisa de um número inteiro de leituras, de 3 a 24, e de uma direção.",
    badHistory: "O histórico guardado não pôde ser lido.",
    unread: "A pool não pôde ser lida.",
    empty: "Ainda não há leituras guardadas.",
    alone: (count, direction) => `Esta leitura está sozinha. Uma leitura não confirma a tendência. A regra precisa de ${count} ${direction} seguidas.`,
    broke: (count, direction) => `A última leitura quebrou a sequência. Uma leitura não confirma a tendência. A regra precisa de ${count} ${direction} seguidas.`,
    short: (streak, count) => `A sequência está em ${streak} de ${count}. Ainda não está confirmada.`,
    act: (block, at, price) => `Confirmada no bloco ${block}, ${at}, preço ${price} USDC.`,
    headWait: "Ainda esperando.",
    headAct: "A tendência está confirmada.",
    down: "quedas",
    up: "altas",
  },
};

function text(lang) {
  return TEXT[lang === "pt" ? "pt" : "en"];
}

export function parseRule(count, direction) {
  const raw = String(count ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 3 || n > 24) return null;
  if (direction !== "up" && direction !== "down") return null;
  return { count: n, direction };
}

export function sanitize(value) {
  if (!Array.isArray(value) || value.length > 48) return null;
  const out = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const block = String(item.block);
    const price = String(item.price);
    const at = String(item.at);
    if (!BLOCK.test(block) || !PRICE.test(price) || !AT.test(at)) return null;
    if (out.length && BigInt(block) <= BigInt(out.at(-1).block)) return null;
    out.push({ block, price, at });
  }
  return out;
}

export function append(observations, reading) {
  const last = observations.at(-1);
  if (last && BigInt(reading.block) <= BigInt(last.block)) return observations;
  return [...observations, reading].slice(-48);
}

function units(price) {
  return BigInt(price.replace(".", ""));
}

export function runLength(observations, direction) {
  let n = observations.length ? 1 : 0;
  for (let i = observations.length - 1; i > 0; i -= 1) {
    const prev = units(observations[i - 1].price);
    const cur = units(observations[i].price);
    const step = direction === "down" ? cur < prev : cur > prev;
    if (!step) break;
    n += 1;
  }
  return n;
}

export function moment(at) {
  return `${at.slice(0, 19).replace("T", " ")} UTC`;
}

export function review(observations, rule, lang = "en") {
  const t = text(lang);
  const parsed = parseRule(rule?.count, rule?.direction);
  if (!parsed) return { ok: false, reason: t.badRule };
  const streak = runLength(observations, parsed.direction);
  const met = streak >= parsed.count;
  const metAt = met ? observations[observations.length - streak + parsed.count - 1] : null;
  let reason = t.empty;
  if (observations.length === 1) reason = t.alone(parsed.count, t[parsed.direction]);
  else if (observations.length > 1 && streak === 1) reason = t.broke(parsed.count, t[parsed.direction]);
  else if (!met && observations.length > 1) reason = t.short(streak, parsed.count);
  else if (met) reason = t.act(metAt.block, moment(metAt.at), metAt.price);
  return {
    ok: true,
    decision: met ? "act" : "wait",
    headline: met ? t.headAct : t.headWait,
    reason,
    streak,
    count: parsed.count,
    direction: parsed.direction,
    observations,
    metAt,
  };
}

export function fail(code, lang = "en") {
  const t = text(lang);
  return { ok: false, reason: t[code] || t.badRule };
}
