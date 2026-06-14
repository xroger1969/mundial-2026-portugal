/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "openligadb-status.json");
const OPENLIGADB_URL = "https://api.openligadb.de/getmatchdata/wm26/2026";

function scoreFromResult(result) {
  if (!result) return null;
  const home = result.pointsTeam1;
  const away = result.pointsTeam2;
  if (home === null || home === undefined || away === null || away === undefined) return null;
  return `${home}–${away}`;
}

function pickResult(match, typeId, regex) {
  const results = Array.isArray(match.matchResults) ? match.matchResults : [];
  if (!results.length) return null;
  const byType = results.find(result => Number(result.resultTypeID) === Number(typeId));
  if (byType) return byType;
  return results.find(result => regex.test(`${result.resultName || ""} ${result.resultDescription || ""}`)) || null;
}

async function main() {
  const response = await fetch(OPENLIGADB_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`OpenLigaDB HTTP ${response.status}`);

  const matches = await response.json();
  if (!Array.isArray(matches)) throw new Error("Resposta inesperada da OpenLigaDB.");

  const samples = matches.slice(0, 12).map(match => {
    const finalScore = scoreFromResult(pickResult(match, 2, /endstand|final|full/i));
    const halftimeScore = scoreFromResult(pickResult(match, 1, /halbzeit|half|intervalo/i));
    const goals = Array.isArray(match.matchGoals) ? match.matchGoals : [];

    return {
      id: match.matchID || null,
      date: match.matchDateTimeUTC || match.matchDateTime || null,
      team1: match.team1?.teamName || match.team1?.shortName || null,
      team2: match.team2?.teamName || match.team2?.shortName || null,
      finished: Boolean(match.matchIsFinished),
      finalScore,
      halftimeScore,
      goalsCount: goals.length,
      goalSamples: goals.slice(0, 5).map(goal => ({
        minute: goal.matchMinute ?? null,
        scorer: goal.goalGetterName || goal.goalGetter?.goalGetterName || null,
        score: goal.scoreTeam1 !== undefined && goal.scoreTeam2 !== undefined ? `${goal.scoreTeam1}–${goal.scoreTeam2}` : null,
        penalty: Boolean(goal.isPenalty),
        ownGoal: Boolean(goal.isOwnGoal)
      }))
    };
  });

  const status = {
    source: "OpenLigaDB",
    url: OPENLIGADB_URL,
    checkedAt: new Date().toISOString(),
    totalMatches: matches.length,
    finishedMatches: matches.filter(match => match.matchIsFinished).length,
    matchesWithAnyResult: matches.filter(match => Array.isArray(match.matchResults) && match.matchResults.length).length,
    matchesWithHalftime: matches.filter(match => scoreFromResult(pickResult(match, 1, /halbzeit|half|intervalo/i))).length,
    matchesWithGoals: matches.filter(match => Array.isArray(match.matchGoals) && match.matchGoals.length).length,
    samples
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(`OpenLigaDB status: ${status.totalMatches} jogos, ${status.matchesWithHalftime} com intervalo, ${status.matchesWithGoals} com golos.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 0;
});
