"use strict";

const games = (window.WC2026_PARTS || []).flat().map(row => ({
  num: row[0], date: row[1], time: row[2], match: row[3], channels: row[4],
  stage: row[5], group: row[6], round: row[7], venue: row[8],
  portugal: Boolean(row[9]), free: Boolean(row[10]), open: Boolean(row[11]), notes: row[12] || ""
}));

const sources = [
  ["Record — Onde ver os jogos do Mundial 2026 em direto: TV e Streaming", "https://www.record.pt/casas-de-apostas/mundial-2026/onde-ver-mundial-2026/"],
  ["Record — Lista de jogos grátis na LiveModeTV durante o Mundial 2026", "https://www.record.pt/casas-de-apostas/mundial-2026/livemodetv/"],
  ["Renascença — Jogos de Portugal, horas e canais", "https://rr.pt/bola-branca/especial/clube-portugal/2026/06/01/mundial-2026-quando-joga-portugal-a-que-horas-sao-os-jogos-e-onde-ver-na-tv-e-online/472960/"],
  ["Diário de Notícias — RTP, SIC e TVI transmitem os jogos de Portugal em sinal aberto", "https://www.dn.pt/desporto/mundial-2026-rtp-sic-e-tvi-garantem-transmisso-em-sinal-aberto-dos-jogos-de-portugal"]
];

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
const state = { portugal:false, open:false, free:false };
const dateFmt = new Intl.DateTimeFormat("pt-PT", { weekday:"short", day:"2-digit", month:"short" });

function norm(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim()}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function uniq(a){return Array.from(new Set(a.filter(Boolean))).sort((x,y)=>String(x).localeCompare(String(y),"pt-PT"))}

function addOptions(select, values){
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  });
}
function channelList(){
  const names = new Set();
  games.forEach(g => String(g.channels).split(/,| e |;/).map(s=>s.trim()).filter(Boolean).forEach(c=>names.add(c.replace(/\s+/g," "))));
  return Array.from(names).sort((a,b)=>a.localeCompare(b,"pt-PT"));
}
function init(){
  addOptions(els.phase, uniq(games.map(g=>g.stage)));
  addOptions(els.group, uniq(games.map(g=>g.group)).map(g=>`Grupo ${g}`));
  addOptions(els.channel, channelList());
  els.summary.innerHTML = `
    <div class="box"><b>${games.length}</b><span>jogos</span></div>
    <div class="box"><b>${games.filter(g=>g.portugal).length}</b><span>Portugal</span></div>
    <div class="box"><b>${games.filter(g=>g.open).length}</b><span>sinal aberto</span></div>
    <div class="box"><b>${games.filter(g=>g.free).length}</b><span>grátis/LiveModeTV</span></div>`;
  els.sources.innerHTML = sources.map(([label,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a></li>`).join("");
  document.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => { state[btn.dataset.toggle] = !state[btn.dataset.toggle]; btn.classList.toggle("active"); render(); }));
  document.getElementById("clear").addEventListener("click", clearFilters);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("csvBtn").addEventListener("click", exportCsv);
  [els.q, els.phase, els.group, els.channel].forEach(el => el.addEventListener("input", render));
  render();
}
function filtered(){
  const q = norm(els.q.value);
  const phase = els.phase.value;
  const group = els.group.value.replace("Grupo ", "");
  const channel = norm(els.channel.value);
  return games.filter(g => {
    const hay = norm([g.match,g.channels,g.stage,g.group,g.round,g.venue,g.notes].join(" "));
    if (q && !hay.includes(q)) return false;
    if (phase && g.stage !== phase) return false;
    if (group && g.group !== group) return false;
    if (channel && !norm(g.channels).includes(channel)) return false;
    if (state.portugal && !g.portugal) return false;
    if (state.open && !g.open) return false;
    if (state.free && !g.free) return false;
    return true;
  }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time) || a.num-b.num);
}
function render(){
  const list = filtered();
  els.visibleCount.textContent = list.length;
  if (!list.length) { els.cards.innerHTML = `<div class="empty">Nenhum jogo encontrado com estes filtros.</div>`; return; }
  els.cards.innerHTML = list.map(card).join("");
}
function card(g){
  const d = new Date(`${g.date}T12:00:00`);
  const channels = String(g.channels).split(/,|;/).map(s=>s.trim()).filter(Boolean).map(c => {
    const cls = /livemode/i.test(c) ? "live" : /sport/i.test(c) ? "sport" : "open";
    return `<span class="tag ${cls}">${esc(c)}</span>`;
  }).join("");
  return `<article class="card ${g.portugal ? "portugal" : ""}">
    <div class="topline"><span class="game-no">Jogo ${g.num}</span><div class="datetime"><div class="date">${esc(dateFmt.format(d))}</div><span class="time">${esc(g.time)}</span></div></div>
    <div class="match">${esc(g.match)}</div>
    <div class="meta"><span class="tag">${esc(g.stage)}</span>${g.group?`<span class="tag group">Grupo ${esc(g.group)}</span>`:""}${g.portugal?`<span class="tag pt">Portugal</span>`:""}${g.open?`<span class="tag open">Sinal aberto</span>`:""}${g.free?`<span class="tag live">Grátis</span>`:""}</div>
    <div class="channels"><div class="label">Onde ver</div><div class="channel-list">${channels}</div></div>
    <div class="venue"><span class="label">Local</span><br>${esc(g.venue)}</div>
    ${g.notes?`<div class="notes"><span class="label">Nota</span><br>${esc(g.notes)}</div>`:""}
  </article>`;
}
function clearFilters(){
  els.q.value = ""; els.phase.value = ""; els.group.value = ""; els.channel.value = "";
  Object.keys(state).forEach(k => state[k] = false);
  document.querySelectorAll(".chip.active").forEach(b => b.classList.remove("active"));
  render();
}
function exportCsv(){
  const rows = [["Jogo","Data","Hora","Jogo","Canais","Fase","Grupo","Local","Notas"]].concat(filtered().map(g=>[g.num,g.date,g.time,g.match,g.channels,g.stage,g.group,g.venue,g.notes]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "calendario-mundial-2026-portugal.csv"; a.click(); URL.revokeObjectURL(a.href);
}

if (!games.length) {
  els.cards.innerHTML = `<div class="empty">Os dados dos jogos não foram carregados. Verifica se os ficheiros data-part-1.js a data-part-4.js estão no repositório.</div>`;
} else {
  init();
}
