"use strict";

const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const RESULTS_FILE = "results.json";

const sources = [
  {
    label: "Record — Onde ver os jogos do Mundial 2026 em direto: TV e Streaming",
    url: "https://www.record.pt/casas-de-apostas/mundial-2026/onde-ver-mundial-2026/"
  },
  {
    label: "Record — Lista de jogos grátis na LiveModeTV durante o Mundial 2026",
    url: "https://www.record.pt/casas-de-apostas/mundial-2026/livemodetv/"
  },
  {
    label: "Renascença — Jogos de Portugal, horas e canais",
    url: "https://rr.pt/bola-branca/especial/clube-portugal/2026/06/01/mundial-2026-quando-joga-portugal-a-que-horas-sao-os-jogos-e-onde-ver-na-tv-e-online/472960/"
  },
  {
    label: "Diário de Notícias — RTP, SIC e TVI transmitem os jogos de Portugal em sinal aberto",
    url: "https://www.dn.pt/desporto/mundial-2026-rtp-sic-e-tvi-garantem-transmisso-em-sinal-aberto-dos-jogos-de-portugal"
  }
];

let games = [];
let resultsData = { matches: {}, status: "not_loaded", updatedAt: null };

const els = {
  q: document.getElementById("q"),
  phase: document.getElementById("phase"),
  group: document.getElementById("group"),
  channel: document.getElementById("channel"),
  cards: document.getElementById("cards"),
  visibleCount: document.getElementById("visibleCount"),
  summary: document.getElementById("summary"),
  sources: document.getElementById("sources")
};

const state = { portugal: false, open: false, free: false };
const dateFmt = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "2-digit", month: "short" });
const updatedFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
    document.head.appendChild(script);
  });
}

async function loadGameData() {
  window.WC2026_PARTS = window.WC2026_PARTS || [];

  if (!window.WC2026_PARTS.length) {
    for (const file of DATA_FILES) {
      await loadScript(file);
    }
  }

  return (window.WC2026_PARTS || []).flat().map(row => ({
    num: row[0],
    date: row[1],
    time: row[2],
    match: row[3],
    channels: row[4],
    stage: row[5],
    group: row[6],
    round: row[7],
    venue: row[8],
    portugal: Boolean(row[9]),
    free: Boolean(row[10]),
    open: Boolean(row[11]),
    notes: row[12] || ""
  })).sort((a, b) => a.num - b.num);
}

async function loadResults() {
  try {
    const response = await fetch(`${RESULTS_FILE}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    resultsData = {
      matches: data.matches || {},
      status: data.status || "loaded",
      provider: data.provider || "",
      updatedAt: data.updatedAt || null,
      message: data.message || ""
    };
  } catch (error) {
    resultsData = { matches: {}, status: "offline", updatedAt: null, message: "Resultados automáticos ainda não disponíveis." };
  }
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "pt-PT"));
}

function addOptions(select, values, prefix) {
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = prefix ? `${prefix} ${value}` : value;
    select.appendChild(option);
  });
}

function channelOptions() {
  return ["RTP 1", "SIC", "TVI", "Sport TV", "Sport TV 1", "Sport TV 5", "LiveModeTV"];
}

function hasChannel(game, selected) {
  if (!selected) return true;
  const ch = norm(game.channels);
  const sel = norm(selected);
  if (sel === "sport tv") return ch.includes("sport tv");
  if (sel === "sport tv 1") return ch.includes("sport tv 1") || ch.includes("sport tv 1 e 5");
  if (sel === "sport tv 5") return ch.includes("sport tv 5") || ch.includes("sport tv 1 e 5");
  if (sel === "livemodetv") return ch.includes("livemodetv");
  return ch.includes(sel);
}

function isFree(game) {
  return Boolean(game.free || game.open || norm(game.channels).includes("livemodetv"));
}

function getGameResult(game) {
  const matches = resultsData.matches || {};
  return matches[String(game.num)] || matches[game.num] || null;
}

function statusText(status) {
  const key = norm(status);
  if (["in_play", "live", "paused"].includes(key)) return "Ao vivo";
  if (["finished", "finalizado"].includes(key)) return "Finalizado";
  if (["postponed", "adiado"].includes(key)) return "Adiado";
  if (["cancelled", "canceled", "cancelado"].includes(key)) return "Cancelado";
  if (["suspended", "suspenso"].includes(key)) return "Suspenso";
  if (["timed", "scheduled", "por disputar"].includes(key)) return "Por disputar";
  return status ? String(status) : "Por disputar";
}

function inferredStatus(game) {
  const date = new Date(`${game.date}T${game.time}:00+01:00`);
  if (Number.isNaN(date.getTime())) return "SCHEDULED";
  const now = new Date();
  if (now < date) return "SCHEDULED";
  if (now - date < 2 * 60 * 60 * 1000) return "IN_PLAY";
  return "SCHEDULED";
}

function resultClass(status) {
  const key = norm(status);
  if (["in_play", "live", "paused"].includes(key)) return "live";
  if (["finished", "finalizado"].includes(key)) return "finished";
  if (["postponed", "cancelled", "canceled", "suspended", "adiado", "cancelado", "suspenso"].includes(key)) return "warning";
  return "scheduled";
}

function scoreText(result) {
  if (!result) return "";
  const home = result.homeScore;
  const away = result.awayScore;
  if (home === null || home === undefined || away === null || away === undefined) return "";
  return `${home}–${away}`;
}

function updatedText() {
  if (!resultsData.updatedAt) return "";
  const d = new Date(resultsData.updatedAt);
  if (Number.isNaN(d.getTime())) return "";
  return `Atualizado ${updatedFmt.format(d)}`;
}

function renderResult(game) {
  const result = getGameResult(game);
  const status = result?.status || inferredStatus(game);
  const score = scoreText(result);
  const minute = result?.minute ? ` · ${escapeHtml(result.minute)}` : "";
  const provider = result?.provider ? ` · ${escapeHtml(result.provider)}` : "";
  const lastUpdate = result?.lastUpdated ? ` · ${escapeHtml(updatedText() || result.lastUpdated)}` : "";

  const main = score
    ? `<span class="score">${escapeHtml(score)}</span>`
    : `<span class="score muted-score">${statusText(status)}</span>`;

  return `<div class="result ${resultClass(status)}">
    <div class="label">Resultado</div>
    <div class="result-line">${main}<span class="status-pill">${escapeHtml(statusText(status))}${minute}</span></div>
    ${result ? `<div class="result-extra">${escapeHtml(result.homeTeam || "")}${result.homeTeam || result.awayTeam ? " vs " : ""}${escapeHtml(result.awayTeam || "")}${provider}${lastUpdate}</div>` : `<div class="result-extra">Resultado automático preparado.</div>`}
  </div>`;
}

function searchable(game) {
  const result = getGameResult(game);
  return norm([
    game.num,
    game.date,
    game.time,
    game.match,
    game.stage,
    game.group,
    game.round,
    game.venue,
    game.channels,
    game.notes,
    result?.status,
    scoreText(result)
  ].join(" "));
}

function filteredGames() {
  const query = norm(els.q.value);
  return games.filter(game => {
    if (query && !searchable(game).includes(query)) return false;
    if (els.phase.value && game.stage !== els.phase.value) return false;
    if (els.group.value && game.group !== els.group.value) return false;
    if (!hasChannel(game, els.channel.value)) return false;
    if (state.portugal && !game.portugal) return false;
    if (state.open && !game.open) return false;
    if (state.free && !isFree(game)) return false;
    return true;
  });
}

function splitChannels(channels) {
  return String(channels || "")
    .split(/[,;]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace("LiveModeTV (YouTube)", "LiveModeTV"));
}

function channelClass(label) {
  const n = norm(label);
  if (n.includes("rtp") || n === "sic" || n === "tvi") return "open";
  if (n.includes("live")) return "live";
  if (n.includes("sport")) return "sport";
  return "";
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return dateFmt.format(d).replace(".", "");
}

function renderSummary(list) {
  const liveCount = games.filter(g => ["IN_PLAY", "LIVE", "PAUSED"].includes(String(getGameResult(g)?.status || "").toUpperCase())).length;
  const finishedCount = games.filter(g => String(getGameResult(g)?.status || "").toUpperCase() === "FINISHED").length;
  const boxes = [
    [games.length, "Jogos totais"],
    [games.filter(g => g.portugal).length, "Jogos de Portugal"],
    [finishedCount, "Resultados finais"],
    [liveCount, "Ao vivo agora"]
  ];

  els.summary.innerHTML = boxes.map(([num, label]) => `<div class="box"><b>${num}</b><span>${label}</span></div>`).join("");
  els.visibleCount.textContent = list.length;
}

function renderCards() {
  const list = filteredGames();
  renderSummary(list);

  if (!list.length) {
    els.cards.innerHTML = `<div class="empty">Não encontrei jogos com esses filtros. Toca em “Limpar filtros” para voltar ao calendário completo.</div>`;
    return;
  }

  els.cards.innerHTML = list.map(game => {
    const group = game.group ? `<span class="tag group">Grupo ${escapeHtml(game.group)}</span>` : "";
    const pt = game.portugal ? `<span class="tag pt">Portugal</span>` : "";
    const open = game.open ? `<span class="tag open">Sinal aberto</span>` : "";
    const free = isFree(game) ? `<span class="tag live">Grátis</span>` : "";
    const channels = splitChannels(game.channels)
      .map(label => `<span class="tag ${channelClass(label)}">${escapeHtml(label)}</span>`)
      .join("");
    const note = game.notes ? `<div class="notes"><div class="label">Nota</div>${escapeHtml(game.notes)}</div>` : "";

    return `<article class="card ${game.portugal ? "portugal" : ""}" data-num="${game.num}">
      <div class="topline">
        <div class="game-no">Jogo ${game.num}</div>
        <div class="datetime"><div class="date">${escapeHtml(formatDate(game.date))}</div><div class="time">${escapeHtml(game.time)}</div></div>
      </div>
      <div class="match">${escapeHtml(game.match)}</div>
      ${renderResult(game)}
      <div class="meta">
        <span class="tag">${escapeHtml(game.stage)}</span>
        ${game.round ? `<span class="tag">${escapeHtml(game.round)}</span>` : ""}
        ${group}${pt}${open}${free}
      </div>
      <div class="venue"><div class="label">Estádio / Cidade</div>${escapeHtml(game.venue || "A confirmar")}</div>
      <div class="channels"><div class="label">Onde ver em Portugal</div><div class="channel-list">${channels}</div></div>
      ${note}
    </article>`;
  }).join("");
}

function downloadCSV() {
  const list = filteredGames();
  const header = ["N.º", "Data", "Hora PT", "Fase", "Grupo", "Jogo", "Resultado", "Estado", "Estádio/Cidade", "Canais em Portugal", "Notas"];
  const rows = list.map(g => {
    const result = getGameResult(g);
    return [g.num, g.date, g.time, g.stage, g.group, g.match, scoreText(result), statusText(result?.status || inferredStatus(g)), g.venue, g.channels, g.notes];
  });
  const csv = [header]
    .concat(rows)
    .map(row => row.map(cell => `"${String(cell == null ? "" : cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calendario_mundial_2026_portugal.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearFilters() {
  els.q.value = "";
  els.phase.value = "";
  els.group.value = "";
  els.channel.value = "";
  state.portugal = false;
  state.open = false;
  state.free = false;
  document.querySelectorAll("[data-toggle]").forEach(btn => btn.classList.remove("active"));
  renderCards();
}

function setupControls() {
  addOptions(els.phase, unique(games.map(g => g.stage)), "");
  addOptions(els.group, unique(games.map(g => g.group)), "Grupo");
  addOptions(els.channel, channelOptions(), "");
  els.sources.innerHTML = sources.map(s => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`).join("");

  if (resultsData.updatedAt || resultsData.message) {
    const li = document.createElement("li");
    li.textContent = resultsData.updatedAt
      ? `Resultados automáticos: ${updatedText()}.`
      : `Resultados automáticos: ${resultsData.message}`;
    els.sources.appendChild(li);
  }

  [els.q, els.phase, els.group, els.channel].forEach(el => {
    el.addEventListener("input", renderCards);
    el.addEventListener("change", renderCards);
  });

  document.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-toggle");
      state[key] = !state[key];
      btn.classList.toggle("active", state[key]);
      renderCards();
    });
  });

  document.getElementById("clear").addEventListener("click", clearFilters);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("csvBtn").addEventListener("click", downloadCSV);
}

async function init() {
  try {
    els.cards.innerHTML = `<div class="empty">A carregar calendário...</div>`;
    games = await loadGameData();
    await loadResults();
    setupControls();
    renderCards();
  } catch (error) {
    console.error(error);
    els.cards.innerHTML = `<div class="empty">Não foi possível carregar os dados do calendário. Verifica se os ficheiros data-part estão no repositório.</div>`;
  }
}

init();
