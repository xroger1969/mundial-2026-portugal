"use strict";

(function () {
  const FIX_ID = "resultStatusFixStyles";
  const FINISH_AFTER_MS = 135 * 60 * 1000;

  function injectStyles() {
    if (document.getElementById(FIX_ID)) return;
    const style = document.createElement("style");
    style.id = FIX_ID;
    style.textContent = `
      .result.finished{
        border-color:rgba(0,196,106,.65) !important;
        background:#00a95b !important;
      }
      .result.finished .result-extra,
      .result.finished .label,
      .result.finished .result-details{
        color:#fff !important;
        opacity:1 !important;
      }
      .result.finished .status-pill{
        color:#fff !important;
        background:rgba(255,255,255,.18) !important;
        border-color:rgba(255,255,255,.42) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function localKickoffFromRow(row) {
    if (!row) return null;
    const date = row[1];
    const time = row[2];
    const parsed = new Date(`${date}T${time}:00+01:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function getGameRow(num) {
    const parts = (window.WC2026_PARTS || []).flat();
    return parts.find(row => String(row[0]) === String(num));
  }

  function hasNumericScore(resultBox) {
    const text = (resultBox.querySelector(".score")?.textContent || "").trim();
    return /^\d+\s*[–-]\s*\d+$/.test(text);
  }

  function shouldForceFinished(card, resultBox) {
    if (!resultBox.classList.contains("live")) return false;
    if (!hasNumericScore(resultBox)) return false;

    const num = card.dataset.num;
    const kickoff = localKickoffFromRow(getGameRow(num));
    if (!kickoff) return false;

    return Date.now() - kickoff.getTime() > FINISH_AFTER_MS;
  }

  function fixCard(card) {
    const resultBox = card.querySelector(".result");
    if (!resultBox || !shouldForceFinished(card, resultBox)) return;

    resultBox.classList.remove("live");
    resultBox.classList.add("finished");
    resultBox.dataset.statusFixed = "finished-after-time";

    const pill = resultBox.querySelector(".status-pill");
    if (pill) pill.textContent = "Finalizado";
  }

  function applyFix() {
    injectStyles();
    document.querySelectorAll("article.card").forEach(fixCard);
  }

  function start() {
    applyFix();
    const observer = new MutationObserver(applyFix);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
