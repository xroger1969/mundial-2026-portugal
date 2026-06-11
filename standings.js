"use strict";

(function () {
  const RESULTS_FILE = "results.json";
  const GROUP_RE = /^[A-L]$/i;
  let schedule = [];
  let resultsData = { matches: {}, updatedAt: null };
  let panelOpen = true;

  const updatedFmt = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

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

  function isFinished(status) {
    const key = norm(status);
    return key === "finished" || key === "finalizado";
  }

  function scoreReady(result) {
    return result
      && isFinished(result.status)
      && result.homeScore !== null
      && result.homeScore !== undefined
      && result.awayScore !== null
      && result.awayScore !== undefined;
  }

  function getResult(game) {
    const matches = resultsData.matches || {};
    return matches[String(game.num)] || matches[game.num] || null;
  }

  function readSchedule() {
    schedule = (window.WC2026_PARTS || []).flat().map(row => ({
      num: row[0],
      date: row[1],
      time: row[2],
      match: row[3],
      stage: row[5],
      group: row[6],
      round: row[7]
    })).sort((a, b) => a.num - b.num);
  }

  async function loadResults() {
    try {
      const response = await fetch(`${RESULTS_FILE}?standings=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      resultsData = {
        matches: data.matches || {},
        updatedAt: data.updatedAt || null,
        status: data.status || "loaded",
        message: data.message || ""
      };
    } catch {
      resultsData = { matches: {}, updatedAt: null, status: "offline", message: "Classificações automáticas ainda não disponíveis." };
    }
  }

  function teamNamesFromGame(game, result) {
    if (result?.homeTeam && result?.awayTeam) {
      return { home: result.homeTeam, away: result.awayTeam };
    }

    const parts = String(game.match || "").split(/\s+vs\s+/i).map(part => part.trim()).filter(Boolean);
    return { home: parts[0] || "A confirmar", away: parts[1] || "A confirmar" };
  }

  function emptyRow(group, team) {
    return {
      group,
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      rank: 0,
      thirdRank: null,
      qualification: ""
    };
  }

  function compareRows(a, b) {
    return (b.points - a.points)
      || (b.goalDifference - a.goalDifference)
      || (b.goalsFor - a.goalsFor)
      || a.team.localeCompare(b.team, "pt-PT");
  }

  function buildStandings() {
    const groups = {};
    let finishedGroupGames = 0;

    schedule.filter(game => game.group && GROUP_RE.test(String(game.group))).forEach(game => {
      const group = String(game.group).toUpperCase();
      const result = getResult(game);
      const { home, away } = teamNamesFromGame(game, result);

      groups[group] = groups[group] || {};
      [home, away].forEach(team => {
        groups[group][team] = groups[group][team] || emptyRow(group, team);
      });

      if (!scoreReady(result)) return;

      finishedGroupGames += 1;
      const homeRow = groups[group][home];
      const awayRow = groups[group][away];
      const homeScore = Number(result.homeScore);
      const awayScore = Number(result.awayScore);

      homeRow.played += 1;
      awayRow.played += 1;
      homeRow.goalsFor += homeScore;
      homeRow.goalsAgainst += awayScore;
      awayRow.goalsFor += awayScore;
      awayRow.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        homeRow.won += 1;
        awayRow.lost += 1;
        homeRow.points += 3;
      } else if (awayScore > homeScore) {
        awayRow.won += 1;
        homeRow.lost += 1;
        awayRow.points += 3;
      } else {
        homeRow.drawn += 1;
        awayRow.drawn += 1;
        homeRow.points += 1;
        awayRow.points += 1;
      }

      homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
      awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;
    });

    const tables = Object.fromEntries(Object.keys(groups).sort().map(group => {
      const rows = Object.values(groups[group]).sort(compareRows).map((row, index) => ({
        ...row,
        rank: index + 1,
        goalDifference: row.goalsFor - row.goalsAgainst
      }));
      return [group, rows];
    }));

    const thirdPlaced = Object.values(tables)
      .map(rows => rows[2])
      .filter(Boolean)
      .sort(compareRows)
      .map((row, index) => ({ ...row, thirdRank: index + 1 }));

    const bestThirdKeys = new Set(thirdPlaced.slice(0, 8).map(row => `${row.group}::${row.team}`));

    Object.values(tables).forEach(rows => {
      rows.forEach(row => {
        const third = thirdPlaced.find(item => item.group === row.group && item.team === row.team);
        const key = `${row.group}::${row.team}`;
        row.thirdRank = third?.thirdRank || null;
        if (!finishedGroupGames) row.qualification = "A aguardar jogos";
        else if (row.rank <= 2) row.qualification = "Apurado neste momento";
        else if (row.rank === 3 && bestThirdKeys.has(key)) row.qualification = "Melhor 3.º neste momento";
        else row.qualification = "Fora neste momento";
      });
    });

    return {
      tables,
      thirdPlaced,
      finishedGroupGames,
      hasFinished: finishedGroupGames > 0,
      bestThirdCount: finishedGroupGames ? Math.min(8, thirdPlaced.length) : 0
    };
  }

  function signed(value) {
    const n = Number(value || 0);
    return n > 0 ? `+${n}` : String(n);
  }

  function qualificationTag(row, hasFinished) {
    if (!hasFinished) return `<span class="qual-tag wait">A aguardar</span>`;
    if (row.rank <= 2) return `<span class="qual-tag direct">Apurado</span>`;
    if (row.rank === 3 && row.thirdRank && row.thirdRank <= 8) return `<span class="qual-tag third">Melhor 3.º</span>`;
    return `<span class="qual-tag out">Fora</span>`;
  }

  function tableHtml(group, rows, hasFinished) {
    return `<article class="standings-card">
      <h3>Grupo ${escapeHtml(group)}</h3>
      <div class="table-wrap">
        <table class="standings-table">
          <thead>
            <tr><th>#</th><th>Seleção</th><th>J</th><th>Pts</th><th>DG</th><th>Estado</th></tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr class="${row.team === "Portugal" ? "portugal-row" : ""}">
              <td>${row.rank}</td>
              <td><strong>${escapeHtml(row.team)}</strong><span>${row.won}V ${row.drawn}E ${row.lost}D · ${row.goalsFor}-${row.goalsAgainst}</span></td>
              <td>${row.played}</td>
              <td><strong>${row.points}</strong></td>
              <td>${signed(row.goalDifference)}</td>
              <td>${qualificationTag(row, hasFinished)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </article>`;
  }

  function bestThirdsHtml(standings) {
    if (!standings.hasFinished) {
      return `<div class="thirds-note">Os 8 melhores terceiros vão aparecer aqui quando houver jogos finalizados.</div>`;
    }

    return `<div class="best-thirds">
      <h3>Melhores terceiros</h3>
      <div class="thirds-list">
        ${standings.thirdPlaced.map(row => `<div class="third-row ${row.thirdRank <= 8 ? "inside" : "outside"}">
          <span>${row.thirdRank}. ${escapeHtml(row.team)} <small>Grupo ${escapeHtml(row.group)}</small></span>
          <strong>${row.points} pts · DG ${signed(row.goalDifference)}</strong>
        </div>`).join("")}
      </div>
    </div>`;
  }

  function updatedText() {
    if (!resultsData.updatedAt) return "";
    const date = new Date(resultsData.updatedAt);
    if (Number.isNaN(date.getTime())) return "";
    return `Atualizado ${updatedFmt.format(date)}`;
  }

  function ensurePanel() {
    let panel = document.getElementById("standingsPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "standingsPanel";
    panel.className = "standings-panel";
    panel.innerHTML = `<details ${panelOpen ? "open" : ""}>
      <summary>Classificações e apurados provisórios</summary>
      <div id="standingsContent"></div>
    </details>`;

    const resultbar = document.querySelector(".resultbar");
    if (resultbar) resultbar.before(panel);
    else document.getElementById("cards")?.before(panel);

    panel.querySelector("details").addEventListener("toggle", event => {
      panelOpen = event.currentTarget.open;
    });

    return panel;
  }

  function renderStandings() {
    if (!schedule.length) return;

    const panel = ensurePanel();
    const content = panel.querySelector("#standingsContent");
    const groupSelect = document.getElementById("group");
    const selectedGroup = groupSelect?.value ? String(groupSelect.value).toUpperCase() : "";
    const standings = buildStandings();
    const groupKeys = Object.keys(standings.tables);
    const shownGroups = selectedGroup && standings.tables[selectedGroup] ? [selectedGroup] : groupKeys;
    const update = updatedText();

    content.innerHTML = `<div class="standings-intro">
      <p><strong>Automático:</strong> a classificação é calculada a partir dos resultados recebidos da API. Critérios usados: pontos, diferença de golos, golos marcados e ordem alfabética como desempate provisório.</p>
      <p>${standings.hasFinished ? `${standings.finishedGroupGames} jogos de grupos finalizados. Os 2 primeiros de cada grupo e os 8 melhores terceiros ficam destacados.` : "Ainda não há jogos de grupos finalizados. As tabelas já estão preparadas."} ${escapeHtml(update)}</p>
    </div>
    <div class="standings-grid">
      ${shownGroups.map(group => tableHtml(group, standings.tables[group], standings.hasFinished)).join("")}
    </div>
    ${bestThirdsHtml(standings)}
    <div class="standings-warning">Nota: o apuramento apresentado é provisório. Em empates reais, a FIFA pode aplicar critérios adicionais, como confronto direto, fair play ou sorteio.</div>`;
  }

  function winnerName(result) {
    const winner = String(result?.winner || "").toUpperCase();
    if (winner === "HOME_TEAM") return result.homeTeam || "Equipa da casa";
    if (winner === "AWAY_TEAM") return result.awayTeam || "Equipa visitante";
    return "";
  }

  function enhanceKnockoutCards() {
    document.querySelectorAll(".card[data-num]").forEach(card => {
      if (card.querySelector(".advanced-line")) return;

      const num = card.getAttribute("data-num");
      const game = schedule.find(item => String(item.num) === String(num));
      if (!game || game.group) return;

      const result = getResult(game);
      const winner = winnerName(result);
      if (!winner || !isFinished(result?.status)) return;

      const extra = card.querySelector(".result-extra");
      if (!extra) return;

      const advanced = document.createElement("span");
      advanced.className = "advanced-line";
      advanced.textContent = ` · Apurado: ${winner}`;
      extra.appendChild(advanced);
    });
  }

  function setupObservers() {
    const groupSelect = document.getElementById("group");
    groupSelect?.addEventListener("change", renderStandings);

    const cards = document.getElementById("cards");
    if (cards) {
      const observer = new MutationObserver(enhanceKnockoutCards);
      observer.observe(cards, { childList: true, subtree: true });
    }
  }

  async function init() {
    readSchedule();
    await loadResults();
    renderStandings();
    enhanceKnockoutCards();
    setupObservers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
