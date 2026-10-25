import { buttonLabel, EXAMPLES } from "./examples.js";
import { journal, loadState, missLine, misses, moment, note, parseRule, pastLine, windowLine, windows } from "./trend.js";

const KEY = "pharos-trend-history";
const $ = (id) => document.getElementById(id);
const copy = {
  en: {
    kicker: "Trend",
    title: "Frozen window.",
    lead: "When your rule is met, that run freezes: the first check, each step, and the lock. A later reading stays outside it. A run that breaks is kept, with the block where it stopped.",
    source: "One source: the 0.01% WPROS/USDC pool, read again on every check.",
    memory: "The checks, the frozen window, and a broken run stay in this browser. A reload does not erase them or record the same block twice.",
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
    met: "Lock",
    run: "Run",
    window: "Frozen window",
    broken: "Broken run",
    open: "Open",
    step: "Step",
    flat: "Flat",
    spike: "Spike",
  },
  pt: {
    kicker: "Tendência",
    title: "Janela travada.",
    lead: "Quando a sua regra se completa, essa sequência congela: a primeira leitura, cada passo e a trava. Uma leitura depois fica fora dela. Uma sequência que quebra fica guardada, com o bloco em que parou.",
    source: "Uma fonte: a pool WPROS/USDC de 0,01%, lida de novo em cada leitura.",
    memory: "As leituras, a janela travada e a sequência quebrada ficam neste navegador. Recarregar não apaga o histórico nem grava o mesmo bloco duas vezes.",
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
    met: "Trava",
    run: "Sequência",
    window: "Janela travada",
    broken: "Sequência quebrada",
    open: "Abertura",
    step: "Passo",
    flat: "Igual",
    spike: "Salto",
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
  lines.push(text.memory);
  $("rules").textContent = lines.join(" ");
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
  const viewed = journal(saved.observations, current, saved.marks);
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
    const panes = windows(saved.observations, current, saved.marks);
    if (panes.length) {
      const label = document.createElement("p");
      label.className = "log-label";
      label.textContent = text.window;
      box.append(label);
      for (const item of panes) {
        const line = document.createElement("p");
        line.className = "detail";
        line.textContent = windowLine(item, lang);
        box.append(line);
      }
    }
    const broken = misses(saved.observations, current);
    if (broken.length) {
      const label = document.createElement("p");
      label.className = "log-label";
      label.textContent = text.broken;
      box.append(label);
      for (const miss of broken) {
        const line = document.createElement("p");
        line.className = "miss";
        line.textContent = missLine(miss, current, lang);
        box.append(line);
      }
    }
    $("out").replaceChildren(box);
  }
  const rows = viewed.ok ? viewed.rows : saved.observations.map((row) => ({ ...row, role: "open" }));
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "detail";
    empty.textContent = text.empty;
    $("history").replaceChildren(empty);
    return;
  }
  $("history").replaceChildren(...rows.map((row, index) => {
    const item = document.createElement("article");
    item.className = `check ${row.role}${row.held ? " held" : ""}`;
    const price = document.createElement("strong");
    price.textContent = `${index + 1} · ${row.price} USDC`;
    const when = document.createElement("span");
    when.textContent = `${row.block} · ${moment(row.at)}`;
    const flag = document.createElement("em");
    flag.textContent = text[row.role] || text.open;
    item.append(price, when, flag);
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
