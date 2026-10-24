import { buttonLabel, EXAMPLES } from "./examples.js";
import { moment, parseRule, review, sanitize } from "./trend.js";

const KEY = "pharos-trend-history";
const $ = (id) => document.getElementById(id);
const copy = {
  en: {
    kicker: "Trend",
    title: "Remember the checks.",
    lead: "Each check reads the 0.01% WPROS/USDC pool and stores the price. The trend is confirmed only after the number of checks you set, and that number is at least 3. One jump does not count.",
    source: "One source: the 0.01% WPROS/USDC pool, read again on every check.",
    memory: "The checks stay in this browser. A reload does not erase them or record the same block twice.",
    rule: "Down or up, for 3 to 24 checks in a row. The moment of confirmation stays on the check that completed the run.",
    direction: "Direction",
    down: "Down",
    up: "Up",
    count: "Checks in a row",
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
    lead: "Cada leitura olha a pool WPROS/USDC de 0,01% e guarda o preço. A tendência só confirma depois do número de leituras que você escolher, no mínimo 3. Um salto não conta.",
    source: "Uma fonte: a pool WPROS/USDC de 0,01%, lida de novo em cada leitura.",
    memory: "As leituras ficam neste navegador. Recarregar não apaga o histórico nem grava o mesmo bloco duas vezes.",
    rule: "Queda ou alta, de 3 a 24 leituras seguidas. O momento da confirmação fica na leitura que completou a sequência.",
    direction: "Direção",
    down: "Queda",
    up: "Alta",
    count: "Leituras seguidas",
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

function observations() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    return sanitize(saved) ?? [];
  } catch {
    return [];
  }
}

function save(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function rule() {
  return { count: $("count").value, direction: $("direction").value };
}

function paint() {
  const text = t();
  $("kicker").textContent = text.kicker;
  $("title").textContent = text.title;
  $("lead").textContent = text.lead;
  $("rules").replaceChildren(...[text.source, text.memory, text.rule].map((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    return span;
  }));
  $("directionL").textContent = text.direction;
  $("countL").textContent = text.count;
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
    button.classList.toggle("on", $("count").value.trim() === row.count && $("direction").value === row.direction);
    return button;
  }));
  render();
}

function render(note = "") {
  const text = t();
  const viewed = review(observations(), rule(), lang);
  $("status").textContent = note;
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
    $("out").replaceChildren(box);
  }
  const rows = viewed.ok ? viewed.observations : observations();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "detail";
    empty.textContent = text.empty;
    $("history").replaceChildren(empty);
    return;
  }
  $("history").replaceChildren(...rows.map((row, index) => {
    const item = document.createElement("article");
    const marked = viewed.metAt?.block === row.block;
    item.className = marked ? "check met" : "check";
    const price = document.createElement("strong");
    price.textContent = `${index + 1} · ${row.price} USDC`;
    const when = document.createElement("span");
    when.textContent = `${row.block} · ${moment(row.at)}`;
    item.append(price, when);
    if (marked) {
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
$("direction").addEventListener("change", () => paint());

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!parseRule($("count").value, $("direction").value)) {
    render();
    return;
  }
  $("go").disabled = true;
  $("status").textContent = t().reading;
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        count: $("count").value.trim(),
        direction: $("direction").value,
        observations: observations(),
        lang,
      }),
    });
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.observations)) {
      $("status").textContent = data.reason || t().failed;
      return;
    }
    save(data.observations);
    render(data.added ? "" : t().stored);
  } catch {
    $("status").textContent = t().failed;
  } finally {
    $("go").disabled = false;
  }
});

paint();
