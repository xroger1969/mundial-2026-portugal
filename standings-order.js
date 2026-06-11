"use strict";

(function () {
  function moveStandingsAfterGames() {
    const panel = document.getElementById("standingsPanel");
    const cards = document.getElementById("cards");

    if (!panel || !cards) return;
    if (cards.nextElementSibling === panel) return;

    cards.after(panel);
  }

  function start() {
    moveStandingsAfterGames();

    const observer = new MutationObserver(moveStandingsAfterGames);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
