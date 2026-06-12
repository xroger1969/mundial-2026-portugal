/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const RESULTS_PATH = path.join(ROOT, "results.json");
const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const API_URL = "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

// Estes valores só são usados como fallback quando a API ainda não devolve golos.
// Se a API trouxer resultado, a API tem sempre prioridade.
const MANUAL_FALLBACK_RESULTS = {
  "2": {
    apiId: 537328,
    status: "FINISHED",
    homeTeam: "South Korea",
    awayTeam: "Czechia",
    homeScore: 2,
    awayScore: 1,
    winner: "HOME_TEAM",
    utcDate: "2026-06-12T02:00:00Z",
    lastUpdated: "2026-06-12T06:45:00Z",
    provider: "manual-fallback"
  }
};

function readExistingResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
  } catch {
    return { matches: {} };
  }
}

function writeResults(payload) {
  const finalPayload = {
    provider: "football-data.org",
    competition: "WC",
    season: "2026",
    ...payload,
    matches: payload.matches || {}
  };
  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(finalPayload, null, 2)}\n`, "utf8");
}

function loadSchedule() {
  const context = { window: { WC2026_PARTS: [] } };
  for (const file of DATA_FILES) {
    const filePath = path.join(ROOT, file);
    const code = fs.readFileSync(filePath, "utf8");
    vm.runInNewContext(code, context, { filename: file });
  }

  return context.window.WC2026_PARTS.flat().map(row => ({
    num: row[0],
    date: row[1],
    time: row[2],
    match: row[3]
  })).sort((a, b) => a.num - b.num);
}

function isTournamentWindow() {
  const now = new Date();
  const start = new Date("2026-06-01T00:00:00Z");
  const end = new Date("2026-07-25T23:59:59Z");
  return now >= start && now <= end;
}

function normalizeStatus(status) {
  const value = String(status || "").toUpperCase();
  if (value === "LIVE") return "IN_PLAY";
  return value || "SCHEDULED";
}

function hasScore(homeScore, awayScore) {
  return homeScore !== null
    && homeScore !== undefined
    && awayScore !== null
    && awayScore !== undefined;
}

function extractScore(match) {
  const score = match.score || {};
  const fullTime = score.fullTime || {};
  const regularTime = score.regularTime || {};
  const halfTime = score.halfTime || {};
  const source = fullTime.home !== null && fullTime.home !== undefined
    ? fullTime
    : regularTime.home !== null && regularTime.home !== undefined
      ? regularTime
      : halfTime;

  return {
    homeScore: source.home ?? null,
    awayScore: source.away ?? null,
    winner: score.winner || null
  };
}

function applyManualFallbackResults(matches) {
  const finalMatches = { ...(matches || {}) };

  Object.entries(MANUAL_FALLBACK_RESULTS).forEach(([num, fallback]) => {
    const current = finalMatches[num] || {};

    // Prioridade absoluta: se a API já trouxe golos, não mexemos.
    if (hasScore(current.homeScore, current.awayScore) && current.provider === "football-data.org") {
      return;
    }

    // Fallback: só entra quando ainda não há resultado fiável.
    if (!hasScore(current.homeScore, current.awayScore)) {
      finalMatches[num] = {
        ...current,
        ...fallback,
        apiId: current.apiId || fallback.apiId,
        utcDate: current.utcDate || fallback.utcDate
      };
    }
  });

  return finalMatches;
}

function buildResultsFromApi(apiMatches, schedule, previousMatches) {
  const sorted = [...(apiMatches || [])].sort((a, b) => {
    const da = new Date(a.utcDate || 0).getTime();
    const db = new Date(b.utcDate || 0).getTime();
    if (da !== db) return da - db;
    return Number(a.id || 0) - Number(b.id || 0);
  });

  const matches = { ...(previousMatches || {}) };

  sorted.forEach((apiMatch, index) => {
    const scheduledGame = schedule[index];
    if (!scheduledGame) return;

    const previous = matches[String(scheduledGame.num)] || {};
    const { homeScore, awayScore, winner } = extractScore(apiMatch);
    let status = normalizeStatus(apiMatch.status);
    let finalHomeScore = homeScore;
    let finalAwayScore = awayScore;
    let finalWinner = winner;

    if (!hasScore(finalHomeScore, finalAwayScore) && hasScore(previous.homeScore, previous.awayScore)) {
      finalHomeScore = previous.homeScore;
      finalAwayScore = previous.awayScore;
      finalWinner = previous.winner || finalWinner;
    }

    if (status === "FINISHED" && !hasScore(finalHomeScore, finalAwayScore)) {
      status = "SCORE_PENDING";
    }

    matches[String(scheduledGame.num)] = {
      apiId: apiMatch.id || previous.apiId || null,
      status,
      homeTeam: apiMatch.homeTeam?.name || previous.homeTeam || null,
      awayTeam: apiMatch.awayTeam?.name || previous.awayTeam || null,
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      winner: finalWinner,
      utcDate: apiMatch.utcDate || previous.utcDate || null,
      lastUpdated: apiMatch.lastUpdated || new Date().toISOString(),
      provider: hasScore(homeScore, awayScore) ? "football-data.org" : (previous.provider || "football-data.org")
    };
  });

  return matches;
}

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const previous = readExistingResults();
  const schedule = loadSchedule();

  if (!token) {
    writeResults({
      status: "waiting_for_api_token",
      updatedAt: previous.updatedAt || null,
      message: "Resultados automáticos preparados. Falta configurar o segredo FOOTBALL_DATA_TOKEN no GitHub.",
      matches: previous.matches || {}
    });
    console.log("FOOTBALL_DATA_TOKEN não está configurado. results.json mantido em modo preparado.");
    return;
  }

  if (!isTournamentWindow() && !process.env.FORCE_RESULTS_UPDATE) {
    writeResults({
      status: "standby",
      updatedAt: previous.updatedAt || null,
      message: "Automação preparada. Fora da janela principal do Mundial 2026, a rotina fica em espera para evitar chamadas desnecessárias à API.",
      matches: previous.matches || {}
    });
    console.log("Fora da janela do torneio. Sem chamada à API.");
    return;
  }

  const response = await fetch(API_URL, {
    headers: {
      "X-Auth-Token": token,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    writeResults({
      status: "api_error",
      updatedAt: previous.updatedAt || null,
      message: `Erro na API football-data.org: HTTP ${response.status}`,
      lastError: body.slice(0, 500),
      matches: previous.matches || {}
    });
    console.log(`Erro na API: HTTP ${response.status}`);
    return;
  }

  const data = await response.json();
  const apiMatches = data.matches || [];
  const apiMatchesBySchedule = buildResultsFromApi(apiMatches, schedule, previous.matches || {});
  const matches = applyManualFallbackResults(apiMatchesBySchedule);

  writeResults({
    status: "ok",
    updatedAt: new Date().toISOString(),
    message: `Atualização automática concluída. Jogos recebidos da API: ${apiMatches.length}. API prioritária; fallback manual usado apenas quando a API não devolve golos.`,
    apiCount: apiMatches.length,
    matches
  });

  console.log(`Resultados atualizados. Jogos recebidos: ${apiMatches.length}.`);
}

main().catch(error => {
  const previous = readExistingResults();
  writeResults({
    status: "script_error",
    updatedAt: previous.updatedAt || null,
    message: `Erro no script de atualização: ${error.message}`,
    matches: previous.matches || {}
  });
  console.error(error);
});
