/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const RESULTS_PATH = path.join(ROOT, "results.json");
const DATA_FILES = ["data-part-1.js", "data-part-2.js", "data-part-3.js", "data-part-4.js"];
const SPORTMONKS_BASE = "https://api.sportmonks.com/v3/football";
const WORLD_CUP_LEAGUE_ID = 732;

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
  "uruguai": "uruguay"
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

function fixtureStartMs(fixture) {
  const raw = fixture.starting_at || fixture.starting_at_timestamp;
  if (!raw) return NaN;
  if (typeof raw === "number") return raw * 1000;
  return new Date(`${String(raw).replace(" ", "T")}Z`).getTime();
}

function participantLocation(participant) {
  return String(participant?.meta?.location || participant?.location || "").toLowerCase();
}

function fixtureTeams(fixture) {
  const participants = Array.isArray(fixture.participants) ? fixture.participants : [];
  let home = participants.find(p => participantLocation(p) === "home");
  let away = participants.find(p => participantLocation(p) === "away");

  if ((!home || !away) && fixture.name) {
    const [homeName, awayName] = String(fixture.name).split(/\s+vs\s+/i).map(part => part.trim());
    home = home || { id: null, name: homeName || "" };
    away = away || { id: null, name: awayName || "" };
  }

  return {
    homeId: home?.id ?? null,
    awayId: away?.id ?? null,
    homeName: home?.name || "",
    awayName: away?.name || "",
    homeNorm: norm(home?.name),
    awayNorm: norm(away?.name)
  };
}

function scoreDescription(score) {
  return norm(`${score?.description || ""} ${score?.type?.name || ""} ${score?.type?.developer_name || ""}`);
}

function scorePriority(score) {
  const d = scoreDescription(score);
  if (d.includes("current")) return 100;
  if (d.includes("full") || d.includes("ft") || d.includes("regular")) return 90;
  if (d.includes("2nd") || d.includes("second")) return 80;
  if (d.includes("1st") || d.includes("first")) return 70;
  return 10;
}

function scoreGoals(score) {
  const value = score?.score?.goals ?? score?.score?.goal ?? score?.score?.score ?? score?.goals ?? score?.value;
  return value === null || value === undefined ? null : Number(value);
}

function fixtureScore(fixture, teams) {
  const scores = Array.isArray(fixture.scores) ? [...fixture.scores] : [];
  if (!scores.length) return { homeScore: null, awayScore: null };

  scores.sort((a, b) => scorePriority(b) - scorePriority(a));

  let homeScore = null;
  let awayScore = null;

  for (const score of scores) {
    const participantId = score.participant_id ?? score.score?.participant_id ?? null;
    const participantName = norm(score.participant?.name || score.team?.name || "");
    const goals = scoreGoals(score);
    if (goals === null || Number.isNaN(goals)) continue;

    if (participantId && teams.homeId && participantId === teams.homeId && homeScore === null) homeScore = goals;
    if (participantId && teams.awayId && participantId === teams.awayId && awayScore === null) awayScore = goals;
    if (!participantId && participantName && participantName === teams.homeNorm && homeScore === null) homeScore = goals;
    if (!participantId && participantName && participantName === teams.awayNorm && awayScore === null) awayScore = goals;
  }

  return { homeScore, awayScore };
}

function fixtureStatus(fixture) {
  const state = norm(`${fixture.state?.name || ""} ${fixture.state?.short_name || ""} ${fixture.state?.developer_name || ""}`);
  const info = norm(fixture.result_info || "");

  if (state.includes("finished") || state.includes("full time") || state === "ft" || info.includes("full time")) return "FINISHED";
  if (state.includes("inplay") || state.includes("in play") || state.includes("live") || state.includes("half time") || state === "ht") return "IN_PLAY";
  if (state.includes("postponed")) return "POSTPONED";
  if (state.includes("cancel")) return "CANCELLED";
  return "TIMED";
}

function winner(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "HOME_TEAM";
  if (awayScore > homeScore) return "AWAY_TEAM";
  return "DRAW";
}

function findScheduledGame(fixture, schedule) {
  const teams = fixtureTeams(fixture);
  const startMs = fixtureStartMs(fixture);
  const maxDiff = 3 * 60 * 60 * 1000;

  const candidates = schedule
    .map(game => ({
      game,
      timeDiff: Math.abs((game.kickoffMs || 0) - (startMs || 0)),
      teamMatch: (game.homeNorm === teams.homeNorm && game.awayNorm === teams.awayNorm)
        || (game.homeNorm === teams.awayNorm && game.awayNorm === teams.homeNorm)
    }))
    .filter(item => Number.isFinite(item.timeDiff) && item.timeDiff <= maxDiff);

  const teamCandidate = candidates.find(item => item.teamMatch);
  if (teamCandidate) return { game: teamCandidate.game, teams };

  if (candidates.length === 1) return { game: candidates[0].game, teams };

  return { game: null, teams };
}

async function fetchSportmonks(endpoint, token) {
  const url = new URL(`${SPORTMONKS_BASE}/${endpoint}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("filters", `fixtureLeagues:${WORLD_CUP_LEAGUE_ID}`);
  url.searchParams.set("include", "scores;participants;state");

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sportmonks ${endpoint}: HTTP ${response.status} ${body.slice(0, 180)}`);
  }

  const data = await response.json();
  return Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
}

async function main() {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    console.log("SPORTMONKS_API_TOKEN não configurado. Sportmonks ignorada.");
    return;
  }

  const results = readJson(RESULTS_PATH, { matches: {} });
  const schedule = loadSchedule();
  const endpoints = ["livescores", "livescores/inplay", "livescores/latest"];
  const fixtures = [];

  for (const endpoint of endpoints) {
    try {
      fixtures.push(...await fetchSportmonks(endpoint, token));
    } catch (error) {
      console.log(error.message);
    }
  }

  const uniqueFixtures = Array.from(new Map(fixtures.map(fixture => [fixture.id, fixture])).values());
  let applied = 0;

  for (const fixture of uniqueFixtures) {
    const { game, teams } = findScheduledGame(fixture, schedule);
    if (!game) continue;

    const { homeScore, awayScore } = fixtureScore(fixture, teams);
    const status = fixtureStatus(fixture);
    const key = String(game.num);
    const previous = results.matches?.[key] || {};

    if (homeScore === null && awayScore === null && status !== "IN_PLAY") continue;

    results.matches = results.matches || {};
    results.matches[key] = {
      ...previous,
      sportmonksId: fixture.id,
      status: homeScore !== null && awayScore !== null ? status : (previous.status || status),
      homeTeam: teams.homeName || previous.homeTeam || game.homeName,
      awayTeam: teams.awayName || previous.awayTeam || game.awayName,
      homeScore: homeScore !== null ? homeScore : previous.homeScore ?? null,
      awayScore: awayScore !== null ? awayScore : previous.awayScore ?? null,
      winner: homeScore !== null && awayScore !== null ? winner(homeScore, awayScore) : previous.winner ?? null,
      utcDate: fixture.starting_at ? `${String(fixture.starting_at).replace(" ", "T")}Z` : previous.utcDate || null,
      lastUpdated: new Date().toISOString(),
      provider: "sportmonks"
    };
    applied += 1;
  }

  if (applied > 0) {
    results.provider = "football-data.org + sportmonks";
    results.updatedAt = new Date().toISOString();
    results.message = `Atualização rápida Sportmonks aplicada a ${applied} jogo(s). Football-data mantém calendário completo.`;
    writeResults(results);
  }

  console.log(`Sportmonks: ${applied} atualização(ões) aplicada(s).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 0;
});
