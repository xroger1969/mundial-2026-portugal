/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const RESULTS_PATH = path.join(ROOT, "results.json");
const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const API_URL = "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

const NAME_ALIASES = {
  "africa do sul": "south africa",
  "alemanha": "germany",
  "arabia saudita": "saudi arabia",
  "argelia": "algeria",
  "argel": "algeria",
  "argentina": "argentina",
  "australia": "australia",
  "belgica": "belgium",
  "bosnia e herzegovina": "bosnia herzegovina",
  "bosnia herzegovina": "bosnia herzegovina",
  "bosnia-herzegovina": "bosnia herzegovina",
  "brasil": "brazil",
  "cabo verde": "cape verde",
  "ilhas de cabo verde": "cape verde",
  "cape verde islands": "cape verde",
  "canada": "canada",
  "catar": "qatar",
  "chequia": "czechia",
  "republica checa": "czechia",
  "colombia": "colombia",
  "coreia do sul": "south korea",
  "costa do marfim": "ivory coast",
  "cote d ivoire": "ivory coast",
  "curacao": "curacao",
  "curacau": "curacao",
  "egito": "egypt",
  "equador": "ecuador",
  "escocia": "scotland",
  "espanha": "spain",
  "estados unidos": "united states",
  "eua": "united states",
  "franca": "france",
  "gana": "ghana",
  "haiti": "haiti",
  "holanda": "netherlands",
  "paises baixos": "netherlands",
  "inglaterra": "england",
  "irao": "iran",
  "iraque": "iraq",
  "japao": "japan",
  "jordania": "jordan",
  "marrocos": "morocco",
  "mexico": "mexico",
  "noruega": "norway",
  "nova zelandia": "new zealand",
  "panama": "panama",
  "paraguai": "paraguay",
  "portugal": "portugal",
  "qatar": "qatar",
  "rd congo": "dr congo",
  "dr congo": "dr congo",
  "congo dr": "dr congo",
  "congo democratic republic": "dr congo",
  "democratic republic of the congo": "dr congo",
  "suica": "switzerland",
  "suecia": "sweden",
  "tunisia": "tunisia",
  "tunsia": "tunisia",
  "turquia": "turkey",
  "uruguai": "uruguay",
  "uzbequistao": "uzbekistan",
  "uzbequistan": "uzbekistan",

  "alg": "algeria",
  "dza": "algeria",
  "arg": "argentina",
  "aus": "australia",
  "aut": "austria",
  "bel": "belgium",
  "bih": "bosnia herzegovina",
  "bra": "brazil",
  "can": "canada",
  "civ": "ivory coast",
  "cod": "dr congo",
  "col": "colombia",
  "cpv": "cape verde",
  "cro": "croatia",
  "cuw": "curacao",
  "cze": "czechia",
  "ecu": "ecuador",
  "egy": "egypt",
  "eng": "england",
  "esp": "spain",
  "fra": "france",
  "ger": "germany",
  "deu": "germany",
  "gha": "ghana",
  "hti": "haiti",
  "iri": "iran",
  "irq": "iraq",
  "jor": "jordan",
  "jpn": "japan",
  "kor": "south korea",
  "ksa": "saudi arabia",
  "mar": "morocco",
  "mex": "mexico",
  "ned": "netherlands",
  "nzl": "new zealand",
  "nor": "norway",
  "pan": "panama",
  "par": "paraguay",
  "por": "portugal",
  "qat": "qatar",
  "rsa": "south africa",
  "sco": "scotland",
  "sct": "scotland",
  "sen": "senegal",
  "sui": "switzerland",
  "swe": "sweden",
  "tun": "tunisia",
  "tur": "turkey",
  "uru": "uruguay",
  "usa": "united states",
  "uzb": "uzbekistan"
};

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

function stripFlags(value) {
  return String(value || "").replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
}

function norm(value) {
  const cleaned = stripFlags(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return NAME_ALIASES[cleaned] || cleaned;
}

function parseTeams(matchText) {
  const [homeRaw, awayRaw] = stripFlags(matchText || "").split(/\s+vs\s+/i).map(part => part.trim());
  return { homeName: homeRaw || "", awayName: awayRaw || "" };
}

function loadSchedule() {
  const context = { window: { WC2026_PARTS: [] } };
  for (const file of DATA_FILES) {
    const filePath = path.join(ROOT, file);
    const code = fs.readFileSync(filePath, "utf8");
    vm.runInNewContext(code, context, { filename: file });
  }

  return context.window.WC2026_PARTS.flat().map(row => {
    const teams = parseTeams(row[3]);
    return {
      num: row[0],
      date: row[1],
      time: row[2],
      match: row[3],
      ...teams,
      homeNorm: norm(teams.homeName),
      awayNorm: norm(teams.awayName),
      kickoffMs: new Date(`${row[1]}T${row[2]}:00+01:00`).getTime()
    };
  }).sort((a, b) => a.num - b.num);
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

function apiTeam(match, side) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return {
    name: team?.name || team?.shortName || team?.tla || "",
    values: [team?.name, team?.shortName, team?.tla].map(norm).filter(Boolean)
  };
}

function apiKickoffMs(match) {
  const value = new Date(match.utcDate || 0).getTime();
  return Number.isFinite(value) ? value : NaN;
}

function teamMatches(apiValues, scheduledNorm) {
  if (!scheduledNorm || scheduledNorm === "a confirmar" || scheduledNorm.includes("grupo")) return false;
  return apiValues.includes(scheduledNorm);
}

function findScheduledGame(apiMatch, schedule, usedNums) {
  const home = apiTeam(apiMatch, "home");
  const away = apiTeam(apiMatch, "away");
  const startMs = apiKickoffMs(apiMatch);
  const maxDiff = 3 * 60 * 60 * 1000;

  const candidates = schedule
    .filter(game => !usedNums.has(String(game.num)))
    .map(game => {
      const homeMatches = teamMatches(home.values, game.homeNorm);
      const awayMatches = teamMatches(away.values, game.awayNorm);
      const reverseHomeMatches = teamMatches(home.values, game.awayNorm);
      const reverseAwayMatches = teamMatches(away.values, game.homeNorm);
      const timeDiff = Math.abs((game.kickoffMs || 0) - (startMs || 0));

      return {
        game,
        reversed: reverseHomeMatches && reverseAwayMatches,
        teamMatch: (homeMatches && awayMatches) || (reverseHomeMatches && reverseAwayMatches),
        timeDiff
      };
    })
    .filter(item => Number.isFinite(item.timeDiff) && item.timeDiff <= maxDiff);

  const teamCandidate = candidates.find(item => item.teamMatch);
  if (teamCandidate) return { game: teamCandidate.game, reversed: teamCandidate.reversed, home, away };

  // Só usamos a hora como fallback se houver uma única hipótese. Em jogos simultâneos,
  // é melhor manter o resultado anterior do que arriscar trocar resultados entre jogos.
  if (candidates.length === 1) return { game: candidates[0].game, reversed: false, home, away };

  return { game: null, reversed: false, home, away };
}

function flipWinner(winner) {
  if (winner === "HOME_TEAM") return "AWAY_TEAM";
  if (winner === "AWAY_TEAM") return "HOME_TEAM";
  return winner;
}

function orientScore(score, reversed) {
  if (!reversed) return score;
  return {
    homeScore: score.awayScore,
    awayScore: score.homeScore,
    winner: flipWinner(score.winner)
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
  const usedNums = new Set();
  let linkedByTeamsOrTime = 0;
  let skippedWithoutSafeMatch = 0;

  sorted.forEach(apiMatch => {
    const { game: scheduledGame, reversed, home, away } = findScheduledGame(apiMatch, schedule, usedNums);
    if (!scheduledGame) {
      skippedWithoutSafeMatch += 1;
      return;
    }

    usedNums.add(String(scheduledGame.num));
    linkedByTeamsOrTime += 1;

    const previous = matches[String(scheduledGame.num)] || {};
    const score = orientScore(extractScore(apiMatch), reversed);
    let { homeScore, awayScore, winner } = score;
    let status = normalizeStatus(apiMatch.status);

    if (!hasScore(homeScore, awayScore) && hasScore(previous.homeScore, previous.awayScore)) {
      homeScore = previous.homeScore;
      awayScore = previous.awayScore;
      winner = previous.winner || winner;
    }

    if (status === "FINISHED" && !hasScore(homeScore, awayScore)) {
      status = "SCORE_PENDING";
    }

    matches[String(scheduledGame.num)] = {
      apiId: apiMatch.id || previous.apiId || null,
      status,
      homeTeam: reversed ? (away.name || previous.homeTeam || scheduledGame.homeName || null) : (home.name || previous.homeTeam || scheduledGame.homeName || null),
      awayTeam: reversed ? (home.name || previous.awayTeam || scheduledGame.awayName || null) : (away.name || previous.awayTeam || scheduledGame.awayName || null),
      homeScore,
      awayScore,
      winner,
      utcDate: apiMatch.utcDate || previous.utcDate || null,
      lastUpdated: apiMatch.lastUpdated || new Date().toISOString(),
      provider: hasScore(score.homeScore, score.awayScore) ? "football-data.org" : (previous.provider || "football-data.org")
    };
  });

  return { matches, linkedByTeamsOrTime, skippedWithoutSafeMatch };
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
  const built = buildResultsFromApi(apiMatches, schedule, previous.matches || {});
  const matches = applyManualFallbackResults(built.matches);

  writeResults({
    status: "ok",
    updatedAt: new Date().toISOString(),
    message: `Atualização automática concluída. Jogos recebidos da API: ${apiMatches.length}. Jogos ligados ao calendário com validação por equipas/horário: ${built.linkedByTeamsOrTime}. Ignorados sem correspondência segura: ${built.skippedWithoutSafeMatch}. API prioritária; fallback manual usado apenas quando a API não devolve golos.`,
    apiCount: apiMatches.length,
    linkedCount: built.linkedByTeamsOrTime,
    skippedWithoutSafeMatch: built.skippedWithoutSafeMatch,
    matches
  });

  console.log(`Resultados atualizados. Jogos recebidos: ${apiMatches.length}. Ligados: ${built.linkedByTeamsOrTime}. Ignorados sem correspondência segura: ${built.skippedWithoutSafeMatch}.`);
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
