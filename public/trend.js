const PRICE = /^\d+\.\d{6}$/;
const BLOCK = /^\d+$/;
const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const TEXT = {
  en: {
    badRule: "The rule needs a whole number of checks, from 3 to 24, a direction, and a whole number of minutes.",
    badHistory: "The stored history could not be read.",
    unread: "The pool could not be read.",
    empty: "No checks are stored yet.",
    alone: (count, direction) => `This check stands alone. One reading does not confirm the trend. The rule needs ${count} ${direction} checks in a row.`,
    broke: (count, direction) => `The latest check broke the run. One reading does not confirm the trend. The rule needs ${count} ${direction} checks in a row.`,
    short: (streak, count) => `The run is ${streak} of ${count}. It is not confirmed yet.`,
    time: (streak, count, covered, minutes) => `The run is ${streak} of ${count} and covers ${covered} minutes. The rule needs ${minutes} minutes.`,
    act: (block, at, price) => `Confirmed at block ${block}, ${at}, price ${price} USDC.`,
    past: (block, at, price) => `The rule was met at block ${block}, ${at}, price ${price} USDC.`,
    frozen: (from, block, at, minutes, price) => `Frozen from block ${from} to block ${block}, ${at}, ${minutes} minutes, price ${price} USDC.`,
    miss: (block, at, streak, count) => `Stopped at block ${block}, ${at}, after ${streak} of ${count}.`,
    missTime: (block, at, streak, count, covered, minutes) => `Stopped at block ${block}, ${at}, after ${streak} of ${count}, covering ${covered} of ${minutes} minutes.`,
    headWait: "Still waiting.",
    headAct: "Window frozen.",
    down: "down",
    up: "up",
  },
  pt: {
    badRule: "A regra precisa de um número inteiro de leituras, de 3 a 24, de uma direção e de um número inteiro de minutos.",
    badHistory: "O histórico guardado não pôde ser lido.",
    unread: "A pool não pôde ser lida.",
    empty: "Ainda não há leituras guardadas.",
    alone: (count, direction) => `Esta leitura está sozinha. Uma leitura não confirma a tendência. A regra precisa de ${count} ${direction} seguidas.`,
    broke: (count, direction) => `A última leitura quebrou a sequência. Uma leitura não confirma a tendência. A regra precisa de ${count} ${direction} seguidas.`,
    short: (streak, count) => `A sequência está em ${streak} de ${count}. Ainda não está confirmada.`,
    time: (streak, count, covered, minutes) => `A sequência está em ${streak} de ${count} e cobre ${covered} minutos. A regra precisa de ${minutes} minutos.`,
    act: (block, at, price) => `Confirmada no bloco ${block}, ${at}, preço ${price} USDC.`,
    past: (block, at, price) => `A regra foi atingida no bloco ${block}, ${at}, preço ${price} USDC.`,
    frozen: (from, block, at, minutes, price) => `Janela travada do bloco ${from} ao bloco ${block}, ${at}, ${minutes} minutos, preço ${price} USDC.`,
    miss: (block, at, streak, count) => `Parou no bloco ${block}, ${at}, em ${streak} de ${count}.`,
    missTime: (block, at, streak, count, covered, minutes) => `Parou no bloco ${block}, ${at}, em ${streak} de ${count}, com ${covered} de ${minutes} minutos.`,
    headWait: "Ainda esperando.",
    headAct: "Janela travada.",
    down: "quedas",
    up: "altas",
  },
};

function text(lang) {
  return TEXT[lang === "pt" ? "pt" : "en"];
}

export function parseRule(count, direction, minutes = 0) {
  const raw = String(count ?? "").trim();
  const span = minutes == null ? "0" : String(minutes).trim();
  if (!/^\d+$/.test(raw) || !/^\d+$/.test(span)) return null;
  const n = Number(raw);
  const wait = Number(span);
  if (n < 3 || n > 24 || wait > 1440) return null;
  if (direction !== "up" && direction !== "down") return null;
  return { count: n, direction, minutes: wait };
}

export function sanitize(value) {
  if (!Array.isArray(value)) return null;
  const source = value.length > 48 ? value.slice(-48) : value;
  const out = [];
  for (const item of source) {
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

function sanitizeMarks(value, observations) {
  if (!Array.isArray(value)) return [];
  const byBlock = new Map(observations.map((row) => [row.block, row]));
  const out = [];
  for (const mark of value) {
    if (!mark || typeof mark !== "object") continue;
    const parsed = parseRule(mark.count, mark.direction, mark.minutes);
    const row = byBlock.get(String(mark.block));
    if (!parsed || !row) continue;
    const key = `${row.block}:${parsed.count}:${parsed.direction}:${parsed.minutes}`;
    if (out.some((item) => `${item.block}:${item.count}:${item.direction}:${item.minutes}` === key)) continue;
    const from = mark.from == null ? "" : String(mark.from);
    const stored = {
      block: row.block,
      price: row.price,
      at: row.at,
      count: parsed.count,
      direction: parsed.direction,
      minutes: parsed.minutes,
    };
    if (BLOCK.test(from) && byBlock.has(from) && BigInt(from) <= BigInt(row.block)) stored.from = from;
    out.push(stored);
  }
  return out;
}

export function loadState(raw) {
  if (Array.isArray(raw)) {
    const observations = sanitize(raw);
    return observations ? { observations, marks: [] } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const observations = sanitize(raw.observations ?? []);
  if (!observations) return null;
  return { observations, marks: sanitizeMarks(raw.marks, observations) };
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

function onward(prev, row, direction) {
  const before = units(prev.price);
  const after = units(row.price);
  return direction === "down" ? after < before : after > before;
}

function streakStart(observations, end, direction) {
  let start = end;
  while (start > 0 && onward(observations[start - 1], observations[start], direction)) start -= 1;
  return start;
}

function coveredMinutes(start, end) {
  const span = Date.parse(end.at) - Date.parse(start.at);
  if (!Number.isFinite(span) || span < 0) return 0;
  return Math.floor(span / 60000);
}

function confirmation(observations, streak, count, minutes) {
  if (streak < count) return null;
  const start = observations.length - streak;
  for (let i = start + count - 1; i < observations.length; i += 1) {
    if (coveredMinutes(observations[start], observations[i]) >= minutes) return observations[i];
  }
  return null;
}

export function review(observations, rule, lang = "en") {
  const t = text(lang);
  const parsed = parseRule(rule?.count, rule?.direction, rule?.minutes);
  if (!parsed) return { ok: false, reason: t.badRule };
  const streak = runLength(observations, parsed.direction);
  const metAt = confirmation(observations, streak, parsed.count, parsed.minutes);
  const met = Boolean(metAt);
  let reason = t.empty;
  if (observations.length === 1) reason = t.alone(parsed.count, t[parsed.direction]);
  else if (observations.length > 1 && streak === 1) reason = t.broke(parsed.count, t[parsed.direction]);
  else if (streak < parsed.count && observations.length > 1) reason = t.short(streak, parsed.count);
  else if (!met && streak >= parsed.count) {
    const start = observations[observations.length - streak];
    reason = t.time(streak, parsed.count, coveredMinutes(start, observations.at(-1)), parsed.minutes);
  } else if (met) reason = t.act(metAt.block, moment(metAt.at), metAt.price);
  return {
    ok: true,
    decision: met ? "act" : "wait",
    headline: met ? t.headAct : t.headWait,
    reason,
    streak,
    count: parsed.count,
    direction: parsed.direction,
    minutes: parsed.minutes,
    observations,
    metAt,
  };
}

export function note(state, rule) {
  const viewed = review(state.observations, rule);
  const marks = Array.isArray(state.marks) ? state.marks : [];
  if (!viewed.ok || !viewed.metAt) return marks;
  const same = marks.some((mark) => mark.block === viewed.metAt.block && mark.count === viewed.count && mark.direction === viewed.direction && mark.minutes === viewed.minutes);
  if (same) return marks;
  const end = viewed.observations.findIndex((row) => row.block === viewed.metAt.block);
  const start = streakStart(viewed.observations, end, viewed.direction);
  return [...marks, {
    block: viewed.metAt.block,
    price: viewed.metAt.price,
    at: viewed.metAt.at,
    count: viewed.count,
    direction: viewed.direction,
    minutes: viewed.minutes,
    from: viewed.observations[start].block,
  }];
}

export function remembered(marks, rule, lang = "en") {
  const parsed = parseRule(rule?.count, rule?.direction, rule?.minutes);
  if (!parsed || !Array.isArray(marks)) return [];
  return marks.filter((mark) => mark.count === parsed.count && mark.direction === parsed.direction && mark.minutes === parsed.minutes);
}

function moveRole(prev, row, direction) {
  if (!prev) return "open";
  if (units(prev.price) === units(row.price)) return "flat";
  return onward(prev, row, direction) ? "step" : "spike";
}

function pane(observations, start, end) {
  const rows = observations.slice(start, end + 1);
  const last = rows.at(-1);
  return {
    from: rows[0].block,
    block: last.block,
    at: last.at,
    price: last.price,
    minutes: coveredMinutes(rows[0], last),
    rows,
  };
}

export function windowOf(observations, mark) {
  const end = observations.findIndex((row) => row.block === String(mark.block));
  if (end < 0 || (mark.direction !== "down" && mark.direction !== "up")) return null;
  let start = mark.from ? observations.findIndex((row) => row.block === String(mark.from)) : -1;
  if (start < 0 || start > end) start = streakStart(observations, end, mark.direction);
  return pane(observations, start, end);
}

export function windows(observations, rule, marks = []) {
  const viewed = review(observations, rule);
  if (!viewed.ok) return [];
  const found = remembered(marks, rule);
  const panes = [];
  for (const mark of found) {
    const frozen = windowOf(observations, mark);
    if (frozen && !panes.some((item) => item.block === frozen.block)) panes.push(frozen);
  }
  if (viewed.metAt && !panes.some((item) => item.block === viewed.metAt.block)) {
    const end = observations.findIndex((row) => row.block === viewed.metAt.block);
    panes.push(pane(observations, streakStart(observations, end, viewed.direction), end));
  }
  return panes;
}

export function misses(observations, rule) {
  const parsed = parseRule(rule?.count, rule?.direction, rule?.minutes);
  if (!parsed || observations.length < 2) return [];
  const out = [];
  let start = 0;
  while (start < observations.length) {
    let end = start;
    while (end + 1 < observations.length && onward(observations[end], observations[end + 1], parsed.direction)) end += 1;
    const streak = end - start + 1;
    const broke = observations[end + 1];
    if (broke && streak >= 2) {
      const slice = observations.slice(start, end + 1);
      const metAt = confirmation(slice, streak, parsed.count, parsed.minutes);
      if (!metAt) {
        out.push({
          block: broke.block,
          at: broke.at,
          price: broke.price,
          from: observations[start].block,
          streak,
          covered: coveredMinutes(observations[start], observations[end]),
        });
      }
    }
    start = end + 1;
  }
  return out;
}

export function windowLine(paneRow, lang = "en") {
  return text(lang).frozen(paneRow.from, paneRow.block, moment(paneRow.at), paneRow.minutes, paneRow.price);
}

export function missLine(miss, rule, lang = "en") {
  const parsed = parseRule(rule?.count, rule?.direction, rule?.minutes);
  const t = text(lang);
  const when = moment(miss.at);
  if (parsed && parsed.minutes > 0 && miss.streak >= parsed.count) {
    return t.missTime(miss.block, when, miss.streak, parsed.count, miss.covered, parsed.minutes);
  }
  return t.miss(miss.block, when, miss.streak, parsed ? parsed.count : miss.streak);
}

export function journal(observations, rule, marks = []) {
  const viewed = review(observations, rule);
  if (!viewed.ok) return viewed;
  const locks = new Set(remembered(marks, rule).map((mark) => mark.block));
  if (viewed.metAt) locks.add(viewed.metAt.block);
  const held = new Set(windows(observations, rule, marks).flatMap((item) => item.rows.map((row) => row.block)));
  const rows = observations.map((row, index) => ({
    ...row,
    role: locks.has(row.block) ? "lock" : moveRole(observations[index - 1], row, viewed.direction),
    held: held.has(row.block),
  }));
  return { ...viewed, rows };
}

export function pastLine(marks, rule, lang = "en") {
  const found = remembered(marks, rule, lang);
  const latest = found.at(-1);
  if (!latest) return "";
  return text(lang).past(latest.block, moment(latest.at), latest.price);
}

export function fail(code, lang = "en") {
  const t = text(lang);
  return { ok: false, reason: t[code] || t.badRule };
}
