"use strict";

(function () {
  const RESULT = {
    home: "México",
    away: "África do Sul",
    homeScore: 2,
    awayScore: 0
  };

  function fixMatchCard() {
    const card = document.querySelector('.card[data-num="1"]');
    if (!card) return;

    const resultBox = card.querySelector(".result");
    if (!resultBox) return;

    resultBox.classList.remove("warning", "scheduled", "live");
    resultBox.classList.add("finished");

    const score = resultBox.querySelector(".score");
    if (score) {
      score.textContent = `${RESULT.homeScore}–${RESULT.awayScore}`;
      score.classList.remove("muted-score");
    }

    const pill = resultBox.querySelector(".status-pill");
    if (pill) pill.textContent = "Finalizado";

    const extra = resultBox.querySelector(".result-extra");
    if (extra) {
      extra.textContent = `${RESULT.home} ${RESULT.homeScore}–${RESULT.awayScore} ${RESULT.away} · Resultado confirmado`;
    }
  }

  function rowHtml(rank, team, stats, played, points, dg) {
    return `<tr>
      <td>${rank}</td>
      <td><strong>${team}</strong><span>${stats}</span></td>
      <td>${played}</td>
      <td><strong>${points}</strong></td>
      <td>${dg}</td>
      <td><span class="qual-tag wait" title="Classificação provisória">Prov.</span></td>
    </tr>`;
  }

  function fixGroupA() {
    const cards = Array.from(document.querySelectorAll(".standings-card"));
    const groupA = cards.find(card => /Grupo\s+A/i.test(card.querySelector("h3")?.textContent || ""));
    if (!groupA) return;

    const tbody = groupA.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = [
      rowHtml(1, "🇲🇽 México", "1V 0E 0D · 2-0", 1, 3, "+2"),
      rowHtml(2, "🇨🇿 Czechia", "0V 0E 0D · 0-0", 0, 0, "0"),
      rowHtml(3, "🇰🇷 South Korea", "0V 0E 0D · 0-0", 0, 0, "0"),
      rowHtml(4, "🇿🇦 África do Sul", "0V 0E 1D · 0-2", 1, 0, "-2")
    ].join("");
  }

  function applyFixes() {
    fixMatchCard();
    fixGroupA();
  }

  function start() {
    applyFixes();
    const observer = new MutationObserver(applyFixes);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
