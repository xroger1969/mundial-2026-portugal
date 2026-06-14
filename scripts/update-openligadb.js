/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const RESULTS_PATH = path.join(ROOT, "results.json");
const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const OPENLIGADB_URL = "https://api.openligadb.de/getmatchdata/wm26/2026";

const NAME_ALIASES = {
  "africa do sul": "south africa",
  "alemanha": "germany",
  "arabia saudita": "saudi arabia",
  "argelia": "algeria",
  "argentina": "argentina",
  "australia": "australia",
  "belgica": "belgium",
  "bosnia e herzegovina": "bosnia herzegovina",
  "bosnia-herzegovina": "bosnia herzegovina",
  "brasil": "brazil",
  "canada": "canada",
  "catar": "qatar",
  "chile": "chile",
  "chequia": "czechia",
  "colombia": "colombia",
  "coreia do sul": "south korea",
  "curacao": "curacao",
  "dinamarca": "denmark",
  "escocia": "scotland",
  "espanha": "spain",
  "estados unidos": "united states",
  "eua": "united states",
  "franca": "france",
  "haiti": "haiti",
  "holanda": "netherlands",
  "inglaterra": "england",
  "italia": "italy",
  "japao": "japan",
  "marrocos": "morocco",
  "mexico": "mexico",
  "nigeria": "nigeria",
  "paraguai": "paraguay",
  "portugal": "portugal",
  "qatar": "qatar",
  "suica": "switzerland",
  "turquia": "turkey",
  "uruguai": "uruguay",
  "usa": "united states",
  "deu": "germany",
  "cuw": "curacao",
  "sct": "scotland",
  "hti": "haiti",
  "aus": "australia",
  "tur": "turkey",
  "kor": "south korea",
  "cze": "czechia",
  "mex": "mexico",
  "rsa": "south africa",
  "bra": "brazil",
  "mar": "morocco",
  "can": "canada",
  "bih": "bosnia herzegovina"
};

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeResults(payload) {
  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

function loadSchedule() {
  const context = { window: { WC2026_PARTS: [] } };

  for (const file of DATA_FILES) {
    const filePath = path.join(ROOT, file);
    const code = fs.readFileSync(filePath, "utf8");
    vm.runInNewContext(code, context, { filename: file });
  }

  return context.window.WC2026_PARTS.flat().map(row => {
    const match = stripFlags(row[3] || "");
    const [homeRaw, awayRaw] = match.split(/\s+vs\s+/i).map(part => part.trim());

    return {
      num: row[0],
      date: row[1],
      time: row[2],
      match: row[3],
      homeName: homeRaw || "",
      awayName: awayRaw || "",
      homeNorm: norm(homeRaw),
      awayNorm: norm(awayRaw),
      kickoffMs: new Date(`${row[1]}T${row[2]}:00+01:00`).getTime()
    };
  });
}

function openligaTeam(match, side) {
  const team = side === 1 ? match.team1 : match.team2;
  return {
    name: team?.teamName || team?.shortName || "",
    shortName: team?.shortName || "",
    normName: norm(team?.teamName),
    normShort: norm(team?.shortName)
  };
}

function openligaStartMs(match) {
  const raw = match.matchDateTimeUTC || match.matchDateTime;
  if (!raw) return NaN;
  const iso = String(raw).replace(" ", "T");
  return new Date(match.matchDateTimeUTC ? `${iso}Z` : iso).getTime();
}

function findScheduledGame(openligaMatch, schedule) {
  const home = openligaTeam(openligaMatch, 1);
  const away = openligaTeam(openligaMatch, 2);
  const startMs = openligaStartMs(openligaMatch);
  const maxDiff = 3 * 60 * 60 * 1000;

  const candidates = schedule
    .map(game => {
      const homeMatches = [home.normName, home.normShort].filter(Boolean).includes(game.homeNorm);
      const awayMatches = [away.normName, away.normShort].filter(Boolean).includes(game.awayNorm);
      const reverseHomeMatches = [home.normName, home.normShort].filter(Boolean).includes(game.awayNorm);
      const reverseAwayMatches = [away.normName, away.normShort].filter(Boolean).includes(game.homeNorm);
      return {
        game,
        teamMatch: (homeMatches && awayMatches) || (reverseHomeMatches && reverseAwayMatches),
        timeDiff: Math.abs((game.kickoffMs || 0) - (startMs || 0))
      };
    })
    .filter(item => Number.isFinite(item.timeDiff) && item.timeDiff <= maxDiff);

  const teamCandidate = candidates.find(item => item.teamMatch);
  if (teamCandidate) return { game: teamCandidate.game, home, away };

  if (candidates.length === 1) return { game: candidates[0].game, home, away };

  return { game: null, home, away };
}

function pickResult(match, typeId, fallbackRegex) {
  const results = Array.isArray(match.matchResults) ? match.matchResults : [];
  if (!results.length) return null;

  if (typeId !== null && typeId !== undefined) {
    const found = results.find(r => Number(r.resultTypeID) === Number(typeId));
    if (found) return found;
  }

  if (fallbackRegex) {
    const found = results.find(r => fallbackRegex.test(`${r.resultName || ""} ${r.resultDescription || ""}`));
    if (found) return found;
  }

  return null;
}

function resultScore(result) {
  if (!result) return null;
  const homeScore = result.pointsTeam1;
  const awayScore = result.pointsTeam2;
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;
  return { homeScore: Number(homeScore), awayScore: Number(awayScore) };
}

function finalScore(match) {
  const final = pickResult(match, 2, /endstand|final|full/i)
    || (Array.isArray(match.matchResults) ? [...match.matchResults].sort((a, b) => Number(b.resultOrderID || 0) - Number(a.resultOrderID || 0))[0] : null);

  return resultScore(final) || { homeScore: null, awayScore: null };
}

function halftimeScore(match) {
  const halftime = pickResult(match, 1, /halbzeit|half|intervalo/i);
  return resultScore(halftime);
}

function extractGoals(match) {
  const goals = Array.isArray(match.matchGoals) ? match.matchGoals : [];
  return goals
    .map(goal => ({
      minute: goal.matchMinute === null || goal.matchMinute === undefined ? null : Number(goal.matchMinute),
      scorer: goal.goalGetterName || goal.goalGetter?.goalGetterName || "",
      score: goal.scoreTeam1 !== undefined && goal.scoreTeam2 !== undefined
        ? `${goal.scoreTeam1}–${goal.scoreTeam2}`
        : "",
      penalty: Boolean(goal.isPenalty),
      ownGoal: Boolean(goal.isOwnGoal),
      overtime: Boolean(goal.isOvertime),
      comment: goal.comment || ""
    }))
    .filter(goal => goal.scorer || goal.minute !== null || goal.score)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
}

function openLigaExtra(match) {
  const halftime = halftimeScore(match);
  const goals = extractGoals(match);
  if (!halftime && !goals.length) return null;

  return {
    id: match.matchID || null,
    halftime,
    goals,
    source: "openligadb"
  };
}

function winner(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "HOME_TEAM";
  if (awayScore > homeScore) return "AWAY_TEAM";
  return "DRAW";
}

function shouldOverwriteScore(previous, openligaStatus, homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return false;

  const previousHasScore = previous.homeScore !== null
    && previous.homeScore !== undefined
    && previous.awayScore !== null
    && previous.awayScore !== undefined;

  if (!previousHasScore) return true;
  if (previous.status !== "FINISHED" && openligaStatus === "FINISHED") return true;

  return false;
}

function sameJson(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

async function main() {
  const results = readJson(RESULTS_PATH, { matches: {} });
  const schedule = loadSchedule();

  const response = await fetch(OPENLIGADB_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`OpenLigaDB HTTP ${response.status}`);

  const matches = await response.json();
  if (!Array.isArray(matches)) throw new Error("Resposta inesperada da OpenLigaDB.");

  let applied = 0;
  let enriched = 0;

  for (const match of matches) {
    const { game, home, away } = findScheduledGame(match, schedule);
    if (!game) continue;

    const { homeScore, awayScore } = finalScore(match);
    const status = match.matchIsFinished ? "FINISHED" : "TIMED";
    const key = String(game.num);
    const previous = results.matches?.[key] || {};
    const extra = openLigaExtra(match);
    const overwriteScore = shouldOverwriteScore(previous, status, homeScore, awayScore);
    const hasNewExtra = extra && !sameJson(previous.openLiga, extra);

    if (!overwriteScore && !hasNewExtra) continue;

    results.matches = results.matches || {};

    const next = {
      ...previous,
      openLigaId: match.matchID || previous.openLigaId || null,
      openLiga: extra || previous.openLiga || null
    };

    if (overwriteScore) {
      Object.assign(next, {
        status,
        homeTeam: home.name || previous.homeTeam || game.homeName,
        awayTeam: away.name || previous.awayTeam || game.awayName,
        homeScore,
        awayScore,
        winner: winner(homeScore, awayScore),
        utcDate: match.matchDateTimeUTC ? `${String(match.matchDateTimeUTC).replace(" ", "T")}Z` : previous.utcDate || null,
        lastUpdated: new Date().toISOString(),
        provider: "openligadb"
      });
      applied += 1;
    } else if (hasNewExtra) {
      next.openLigaUpdatedAt = new Date().toISOString();
      enriched += 1;
    }

    results.matches[key] = next;
  }

  if (applied > 0 || enriched > 0) {
    results.provider = applied > 0 ? "football-data.org + openligadb" : results.provider || "football-data.org";
    results.updatedAt = new Date().toISOString();
    results.message = applied > 0
      ? `OpenLigaDB aplicada a ${applied} jogo(s) e detalhes acrescentados a ${enriched} jogo(s).`
      : `OpenLigaDB acrescentou detalhes a ${enriched} jogo(s).`;
    writeResults(results);
  }

  console.log(`OpenLigaDB: ${applied} resultado(s), ${enriched} detalhe(s) acrescentado(s).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 0;
});
