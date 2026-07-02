"use strict";

const RESULTS_FILE = "results.json";

const sources = [
  { label: "Record — Onde ver os jogos do Mundial 2026 em direto: TV e Streaming", url: "https://www.record.pt/casas-de-apostas/mundial-2026/onde-ver-mundial-2026/" },
  { label: "Record — Lista de jogos grátis na LiveModeTV durante o Mundial 2026", url: "https://www.record.pt/casas-de-apostas/mundial-2026/livemodetv/" },
  { label: "Renascença — Jogos de Portugal, horas e canais", url: "https://rr.pt/bola-branca/especial/clube-portugal/2026/06/01/mundial-2026-quando-joga-portugal-a-que-horas-sao-os-jogos-e-onde-ver-na-tv-e-online/472960/" },
  { label: "Diário de Notícias — RTP, SIC e TVI transmitem os jogos de Portugal em sinal aberto", url: "https://www.dn.pt/desporto/mundial-2026-rtp-sic-e-tvi-garantem-transmisso-em-sinal-aberto-dos-jogos-de-portugal" }
];

const TEAM_NAMES_PT = {
  "algeria": "Argélia",
  "argentina": "Argentina",
  "australia": "Austrália",
  "austria": "Áustria",
  "belgium": "Bélgica",
  "bosnia-herzegovina": "Bósnia e Herzegovina",
  "bosnia and herzegovina": "Bósnia e Herzegovina",
  "brazil": "Brasil",
  "canada": "Canadá",
  "cape verde islands": "Cabo Verde",
  "cape verde": "Cabo Verde",
  "colombia": "Colômbia",
  "congo dr": "RD Congo",
  "côte d’ivoire": "Costa do Marfim",
  "cote d'ivoire": "Costa do Marfim",
  "ivory coast": "Costa do Marfim",
  "croatia": "Croácia",
  "czechia": "Chéquia",
  "ecuador": "Equador",
  "egypt": "Egito",
  "england": "Inglaterra",
  "france": "França",
  "germany": "Alemanha",
  "ghana": "Gana",
  "iraq": "Iraque",
  "japan": "Japão",
  "jordan": "Jordânia",
  "mexico": "México",
  "morocco": "Marrocos",
  "netherlands": "Países Baixos",
  "norway": "Noruega",
  "paraguay": "Paraguai",
  "portugal": "Portugal",
  "senegal": "Senegal",
  "south africa": "África do Sul",
  "spain": "Espanha",
  "sweden": "Suécia",
  "switzerland": "Suíça",
  "united states": "Estados Unidos",
  "usa": "Estados Unidos"
};

const KNOCKOUT_NEXT = {
  73: 90, 74: 89, 75: 90, 76: 91, 77: 89, 78: 91, 79: 92, 80: 92,
  81: 94, 82: 94, 83: 93, 84: 93, 85: 96, 86: 95, 87: 96, 88: 95,
  89: 97, 90: 97, 91: 99, 92: 99, 93: 98, 94: 98, 95: 100, 96: 100,
  97: 101, 98: 101, 99: 102, 100: 102, 101: 104, 102: 104
};

const KNOCKOUT_LOSER_NEXT = { 101: 103, 102: 103 };

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
const dateFmt = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" });
const updatedFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
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

function readGameData() {
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

function addOptions(select, values, prefix) {
  if (!select) return;
  select.querySelectorAll("option:not(:first-child)").forEach(option => option.remove());
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

function isKnockoutGame(game) {
  return Number(game?.num) >= 73 || norm(game?.stage).includes("avos") || norm(game?.stage).includes("quartos") || norm(game?.stage).includes("meias") || norm(game?.stage).includes("final") || norm(game?.stage).includes("3.");
}

function getGameResult(game) {
  const matches = resultsData.matches || {};
  return matches[String(game.num)] || null;
}

function teamNamePT(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const key = norm(text);
  if (TEAM_NAMES_PT[key]) return TEAM_NAMES_PT[key];
  return text
    .replace(/^Winner Match\s+(\d+)$/i, "Vencedor $1")
    .replace(/^Loser Match\s+(\d+)$/i, "Vencido $1")
    .replace(/^Vencedor Jogo\s+(\d+)$/i, "Vencedor $1")
    .replace(/^Vencido Jogo\s+(\d+)$/i, "Vencido $1");
}

function cleanMatchText(text) {
  return String(text || "")
    .replace(/Vencedor Jogo\s+(\d+)/g, "Vencedor $1")
    .replace(/Vencido Jogo\s+(\d+)/g, "Vencido $1");
}

function displayMatch(game) {
  const result = getGameResult(game);
  if (isKnockoutGame(game) && result?.homeTeam && result?.awayTeam) {
    return `${teamNamePT(result.homeTeam)} vs ${teamNamePT(result.awayTeam)}`;
  }
  return cleanMatchText(game.match);
}

function winnerName(result) {
  if (!result || !result.winner || result.winner === "DRAW") return "";
  if (result.winner === "HOME_TEAM") return teamNamePT(result.homeTeam);
  if (result.winner === "AWAY_TEAM") return teamNamePT(result.awayTeam);
  return "";
}

function scoreText(result) {
  if (!result) return "";
  if (result.homeScore === null || result.homeScore === undefined) return "";
  if (result.awayScore === null || result.awayScore === undefined) return "";
  return `${result.homeScore}–${result.awayScore}`;
}

function statusText(status) {
  const key = norm(status);
  if (["in_play", "live", "paused"].includes(key)) return "Ao vivo";
  if (["finished", "finalizado"].includes(key)) return "Finalizado";
  if (["timed", "scheduled", "por disputar"].includes(key)) return "Por disputar";
  if (["postponed", "adiado"].includes(key)) return "Adiado";
  if (["cancelled", "canceled", "cancelado"].includes(key)) return "Cancelado";
  if (["suspended", "suspenso"].includes(key)) return "Suspenso";
  return "Por disputar";
}

function resultClass(status) {
  const key = norm(status);
  if (["in_play", "live", "paused"].includes(key)) return "live";
  if (["finished", "finalizado"].includes(key)) return "finished";
  if (["postponed", "cancelled", "canceled", "suspended", "adiado", "cancelado", "suspenso"].includes(key)) return "warning";
  return "scheduled";
}

function inferredStatus(game) {
  const result = getGameResult(game);
  if (result?.status) return result.status;
  return "SCHEDULED";
}

function updatedText() {
  if (!resultsData.updatedAt) return "";
  const d = new Date(resultsData.updatedAt);
  return Number.isNaN(d.getTime()) ? "" : `Atualizado ${updatedFmt.format(d)}`;
}

function resultDetailsText(result) {
  const goals = Array.isArray(result?.openLiga?.goals) ? result.openLiga.goals : [];
  if (!goals.length) return "";
  return goals.slice(0, 4).map(goal => {
    const minute = goal.minute == null ? "" : `${goal.minute}’ `;
    return `${minute}${goal.scorer || "Golo"}`.trim();
  }).join("; ");
}

function progressionText(game) {
  if (!isKnockoutGame(game)) return "";
  const num = Number(game.num);
  if (num === 104) return "Final do Mundial.";
  if (num === 103) return "Jogo de atribuição do 3.º lugar.";

  const result = getGameResult(game);
  const winner = winnerName(result);
  const next = KNOCKOUT_NEXT[num];
  const loserNext = KNOCKOUT_LOSER_NEXT[num];

  if (next && loserNext) {
    return winner
      ? `${winner} segue para a Final. O vencido disputa o 3.º lugar.`
      : `Vencedor segue para a Final. Vencido disputa o 3.º lugar.`;
  }
  if (next) {
    return winner ? `${winner} segue para o Jogo ${next}.` : `Vencedor segue para o Jogo ${next}.`;
  }
  return "";
}

function renderResult(game) {
  const result = getGameResult(game);
  const status = inferredStatus(game);
  const score = scoreText(result);
  const provider = result?.provider ? ` · ${escapeHtml(result.provider)}` : "";
  const lastUpdate = result?.lastUpdated ? ` · ${escapeHtml(updatedText() || result.lastUpdated)}` : "";
  const details = resultDetailsText(result);
  const teams = result?.homeTeam || result?.awayTeam ? `${teamNamePT(result.homeTeam || "")} vs ${teamNamePT(result.awayTeam || "")}` : "";

  const main = score
    ? `<span class="score">${escapeHtml(score)}</span>`
    : `<span class="score muted-score">${escapeHtml(statusText(status))}</span>`;

  return `<div class="result ${resultClass(status)}">
    <div class="label">Resultado</div>
    <div class="result-line">${main}<span class="status-pill">${escapeHtml(statusText(status))}</span></div>
    ${result ? `<div class="result-extra">${escapeHtml(teams)}${provider}${lastUpdate}</div>` : `<div class="result-extra">Resultado automático preparado.</div>`}
    ${details ? `<div class="result-details">${escapeHtml(details)}</div>` : ""}
  </div>`;
}

function searchable(game) {
  const result = getGameResult(game);
  return norm([game.num, game.date, game.time, displayMatch(game), game.stage, game.group, game.round, game.venue, game.channels, game.notes, progressionText(game), result?.status, scoreText(result)].join(" "));
}

function filteredGames() {
  const query = norm(els.q?.value || "");
  return games.filter(game => {
    if (query && !searchable(game).includes(query)) return false;
    if (els.phase?.value && game.stage !== els.phase.value) return false;
    if (els.group?.value && game.group !== els.group.value) return false;
    if (!hasChannel(game, els.channel?.value || "")) return false;
    if (state.portugal && !game.portugal && !norm(displayMatch(game)).includes("portugal")) return false;
    if (state.open && !game.open) return false;
    if (state.free && !isFree(game)) return false;
    return true;
  });
}

function splitChannels(channels) {
  return String(channels || "").split(/[,;]/).map(part => part.trim()).filter(Boolean).map(part => part.replace("LiveModeTV (YouTube)", "LiveModeTV"));
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
  return Number.isNaN(d.getTime()) ? dateStr : dateFmt.format(d).replace(".", "");
}

function renderSummary(list) {
  const liveCount = games.filter(g => ["IN_PLAY", "LIVE", "PAUSED"].includes(String(getGameResult(g)?.status || "").toUpperCase())).length;
  const finishedCount = games.filter(g => String(getGameResult(g)?.status || "").toUpperCase() === "FINISHED").length;
  const boxes = [[games.length, "Jogos totais"], [games.filter(g => g.portugal || norm(displayMatch(g)).includes("portugal")).length, "Jogos de Portugal"], [finishedCount, "Resultados finais"], [liveCount, "Ao vivo agora"]];
  if (els.summary) els.summary.innerHTML = boxes.map(([num, label]) => `<div class="box"><b>${num}</b><span>${label}</span></div>`).join("");
  if (els.visibleCount) els.visibleCount.textContent = list.length;
}

function renderCards() {
  const list = filteredGames();
  renderSummary(list);

  if (!els.cards) return;
  if (!list.length) {
    els.cards.innerHTML = `<div class="empty">Não encontrei jogos com esses filtros. Toca em “Limpar filtros” para voltar ao calendário completo.</div>`;
    return;
  }

  els.cards.innerHTML = list.map(game => {
    const channels = splitChannels(game.channels).map(label => `<span class="tag ${channelClass(label)}">${escapeHtml(label)}</span>`).join("");
    const progression = progressionText(game);
    const notes = [progression, game.notes].filter(Boolean).join(" ");
    const portugalClass = game.portugal || norm(displayMatch(game)).includes("portugal") ? "portugal" : "";

    return `<article class="card ${portugalClass}" data-num="${game.num}">
      <div class="topline"><div class="game-no">Jogo ${game.num}</div><div class="datetime"><div class="date">${escapeHtml(formatDate(game.date))}</div><div class="time">${escapeHtml(game.time)}</div></div></div>
      <div class="match">${escapeHtml(displayMatch(game))}</div>
      ${renderResult(game)}
      <div class="meta"><span class="tag">${escapeHtml(game.stage)}</span>${game.round ? `<span class="tag">${escapeHtml(game.round)}</span>` : ""}${game.group ? `<span class="tag group">Grupo ${escapeHtml(game.group)}</span>` : ""}${portugalClass ? `<span class="tag pt">Portugal</span>` : ""}${game.open ? `<span class="tag open">Sinal aberto</span>` : ""}${isFree(game) ? `<span class="tag live">Grátis</span>` : ""}</div>
      <div class="venue"><div class="label">Estádio / Cidade</div>${escapeHtml(game.venue || "A confirmar")}</div>
      <div class="channels"><div class="label">Onde ver em Portugal</div><div class="channel-list">${channels}</div></div>
      ${notes ? `<div class="notes"><div class="label">Caminho</div>${escapeHtml(notes)}</div>` : ""}
    </article>`;
  }).join("");
}

function clearFilters() {
  if (els.q) els.q.value = "";
  if (els.phase) els.phase.value = "";
  if (els.group) els.group.value = "";
  if (els.channel) els.channel.value = "";
  state.portugal = false;
  state.open = false;
  state.free = false;
  document.querySelectorAll("[data-toggle]").forEach(btn => btn.classList.remove("active"));
  renderCards();
}

function downloadCSV() {
  const rows = filteredGames().map(g => [g.num, g.date, g.time, g.stage, g.group, displayMatch(g), scoreText(getGameResult(g)), statusText(inferredStatus(g)), progressionText(g), g.venue, g.channels, g.notes]);
  const header = ["N.º", "Data", "Hora PT", "Fase", "Grupo", "Jogo", "Resultado", "Estado", "Caminho", "Estádio/Cidade", "Canais em Portugal", "Notas"];
  const csv = [header].concat(rows).map(row => row.map(cell => `"${String(cell == null ? "" : cell).replace(/"/g, '""')}"`).join(",")).join("\n");
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

function setupControls() {
  addOptions(els.phase, unique(games.map(g => g.stage)), "");
  addOptions(els.group, unique(games.map(g => g.group)), "Grupo");
  addOptions(els.channel, channelOptions(), "");
  if (els.sources) els.sources.innerHTML = sources.map(s => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`).join("");

  [els.q, els.phase, els.group, els.channel].filter(Boolean).forEach(el => {
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

  document.getElementById("clear")?.addEventListener("click", clearFilters);
  document.getElementById("printBtn")?.addEventListener("click", () => window.print());
  document.getElementById("csvBtn")?.addEventListener("click", downloadCSV);
}

async function loadResultsInBackground() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${RESULTS_FILE}?v=${Date.now()}`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return;
    const data = await response.json();
    resultsData = { matches: data.matches || {}, status: data.status || "loaded", provider: data.provider || "", updatedAt: data.updatedAt || null, message: data.message || "" };
    renderCards();
  } catch (error) {
    resultsData = { matches: {}, status: "offline", updatedAt: null, message: "Resultados automáticos ainda não disponíveis." };
  }
}

function init() {
  try {
    if (els.cards) els.cards.innerHTML = `<div class="empty">A carregar calendário...</div>`;
    games = readGameData();
    if (!games.length) throw new Error("Sem dados WC2026_PARTS");
    setupControls();
    renderCards();
    loadResultsInBackground();
  } catch (error) {
    console.error(error);
    if (els.cards) els.cards.innerHTML = `<div class="empty">Não foi possível carregar os dados do calendário. Verifica os ficheiros data-part.</div>`;
  }
}

init();
