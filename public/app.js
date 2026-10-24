import { buttonLabel, EXAMPLES } from "./examples.js";
import { loadState, moment, note, parseRule, pastLine, remembered, review } from "./trend.js";

const KEY = "pharos-trend-history";
const $ = (id) => document.getElementById(id);
const copy = {
  en: {
    kicker: "Trend",
    title: "Remember the checks.",
    lead: "Each check reads the 0.01% WPROS/USDC pool and stores the price. You set the direction, how many checks in a row, and how many minutes that run must cover. The minimum is 3 checks. One jump does not count.",
    source: "One source: the 0.01% WPROS/USDC pool, read again on every check.",
    memory: "The checks and the confirmation stay in this browser. A reload does not erase them or record the same block twice.",
    strict: "A flat price or the opposite direction breaks the run. One reading never confirms it.",
    noWait: "No minimum time. The checks alone can confirm the run.",
    wait: (minutes) => `The run must cover at least ${minutes} minutes, from its first check to the confirmation.`,
    checks: (count, direction) => `${direction} · ${count} checks in a row`,
    down: "Down",
    up: "Up",
    direction: "Direction",
    count: "Checks in a row",
    minutes: "Minimum minutes",
    go: "Check",
    reading: "Reading the pool…",
    failed: "The pool could not be read.",
    stored: "This block is already stored.",
    history: "Stored history",
    empty: "No checks are stored yet.",
    met: "Met",
    run: "Run",
  },
  pt: {
    kicker: "Tendência",
    title: "Lembrar as leituras.",
    lead: "Cada leitura olha a pool WPROS/USDC de 0,01% e guarda o preço. Você escolhe a direção, quantas leituras seguidas e quantos minutos essa sequência precisa cobrir. O mínimo é 3 leituras. Um salto não conta.",
    source: "Uma fonte: a pool WPROS/USDC de 0,01%, lida de novo em cada leitura.",
    memory: "As leituras e a confirmação ficam neste navegador. Recarregar não apaga o histórico nem grava o mesmo bloco duas vezes.",
    strict: "Um preço igual ou na direção oposta quebra a sequência. Uma leitura nunca confirma.",
    noWait: "Sem tempo mínimo. As leituras sozinhas podem confirmar a sequência.",
    wait: (minutes) => `A sequência precisa cobrir pelo menos ${minutes} minutos, da primeira leitura até a confirmação.`,
    checks: (count, direction) => `${direction} · ${count} leituras seguidas`,
    down: "Queda",
    up: "Alta",
    direction: "Direção",
    count: "Leituras seguidas",
    minutes: "Minutos mínimos",
    go: "Ler",
    reading: "Lendo a pool…",
    failed: "A pool não pôde ser lida.",
    stored: "Este bloco já está guardado.",
    history: "Histórico guardado",
    empty: "Ainda não há leituras guardadas.",
    met: "Confirmada",
    run: "Sequência",
  },
};

let lang = localStorage.getItem("pharos-trend-lang") === "pt" ? "pt" : "en";

function t() {
  return copy[lang];
}

function state() {
  try {
    return loadState(JSON.parse(localStorage.getItem(KEY) || "[]")) ?? { observations: [], marks: [] };
  } catch {
    return { observations: [], marks: [] };
  }
}

function save(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

function rule() {
  return { count: $("count").value, direction: $("direction").value, minutes: $("minutes").value };
}

function paint() {
  const text = t();
  const parsed = parseRule($("count").value, $("direction").value, $("minutes").value);
  $("kicker").textContent = text.kicker;
  $("title").textContent = text.title;
  $("lead").textContent = text.lead;
  const lines = [text.source];
  if (parsed) {
    lines.push(text.checks(parsed.count, parsed.direction === "down" ? text.down : text.up));
    lines.push(parsed.minutes === 0 ? text.noWait : text.wait(parsed.minutes));
  }
  lines.push(text.strict, text.memory);
  $("rules").replaceChildren(...lines.map((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    return span;
  }));
  $("directionL").textContent = text.direction;
  $("countL").textContent = text.count;
  $("minutesL").textContent = text.minutes;
  $("direction").options[0].textContent = text.down;
  $("direction").options[1].textContent = text.up;
  $("go").textContent = text.go;
  $("logLabel").textContent = text.history;
  document.documentElement.lang = lang;
  for (const button of document.querySelectorAll(".lang button")) button.classList.toggle("on", button.dataset.lang === lang);
  $("chips").replaceChildren(...EXAMPLES.map((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.ex = row.id;
    button.textContent = buttonLabel(row, lang);
    const selected = $("count").value.trim() === row.count && $("direction").value === row.direction && $("minutes").value.trim() === row.minutes;
    button.classList.toggle("on", selected);
    return button;
  }));
  render();
}

function render(noteText = "") {
  const text = t();
  const saved = state();
  const current = rule();
  const viewed = review(saved.observations, current, lang);
  const marks = remembered(saved.marks, current);
  $("status").textContent = noteText;
  const box = document.createElement("article");
  if (!viewed.ok) {
    box.className = "card wait";
    const reason = document.createElement("p");
    reason.textContent = viewed.reason;
    box.append(reason);
    $("out").replaceChildren(box);
  } else if (!viewed.observations.length) {
    $("out").replaceChildren();
  } else {
    box.className = `card ${viewed.decision}`;
    const title = document.createElement("b");
    title.textContent = viewed.headline;
    const reason = document.createElement("p");
    reason.textContent = viewed.reason;
    const run = document.createElement("p");
    run.className = "detail";
    run.textContent = `${text.run} ${viewed.streak} / ${viewed.count}`;
    box.append(title, reason, run);
    const earlier = viewed.decision === "wait" ? pastLine(saved.marks, current, lang) : "";
    if (earlier) {
      const when = document.createElement("p");
      when.className = "detail";
      when.textContent = earlier;
      box.append(when);
    }
    $("out").replaceChildren(box);
  }
  const rows = viewed.ok ? viewed.observations : saved.observations;
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "detail";
    empty.textContent = text.empty;
    $("history").replaceChildren(empty);
    return;
  }
  const marked = new Set(marks.map((mark) => mark.block));
  $("history").replaceChildren(...rows.map((row, index) => {
    const item = document.createElement("article");
    const hit = marked.has(row.block);
    item.className = hit ? "check met" : "check";
    const price = document.createElement("strong");
    price.textContent = `${index + 1} · ${row.price} USDC`;
    const when = document.createElement("span");
    when.textContent = `${row.block} · ${moment(row.at)}`;
    item.append(price, when);
    if (hit) {
      const flag = document.createElement("em");
      flag.textContent = text.met;
      item.append(flag);
    }
    return item;
  }));
}

$("chips").addEventListener("click", (event) => {
  const button = event.target.closest("[data-ex]");
  if (!button) return;
  const row = EXAMPLES.find((item) => item.id === button.dataset.ex);
  $("count").value = row.count;
  $("direction").value = row.direction;
  $("minutes").value = row.minutes;
  paint();
});

for (const button of document.querySelectorAll(".lang button")) {
  button.addEventListener("click", () => {
    lang = button.dataset.lang;
    localStorage.setItem("pharos-trend-lang", lang);
    paint();
  });
}

$("count").addEventListener("input", () => paint());
$("minutes").addEventListener("input", () => paint());
$("direction").addEventListener("change", () => paint());

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const current = rule();
  if (!parseRule(current.count, current.direction, current.minutes)) {
    render();
    return;
  }
  $("go").disabled = true;
  $("status").textContent = t().reading;
  try {
    const saved = state();
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...current, observations: saved.observations, lang }),
    });
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.observations)) {
      $("status").textContent = data.reason || t().failed;
      return;
    }
    const next = {
      observations: data.observations,
      marks: note({ observations: data.observations, marks: saved.marks }, current),
    };
    save(loadState(next) ?? next);
    render(data.added ? "" : t().stored);
  } catch {
    $("status").textContent = t().failed;
  } finally {
    $("go").disabled = false;
  }
});

paint();
