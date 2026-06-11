"use strict";

(function () {
  function ensureResultsJumpButton() {
    const chips = document.querySelector(".chips");
    if (!chips || document.getElementById("resultsJump")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "resultsJump";
    button.className = "chip";
    button.textContent = "Classificações / resultados";
    button.addEventListener("click", () => {
      const panel = document.getElementById("standingsPanel");
      if (!panel) return;

      const details = panel.querySelector("details");
      if (details) details.open = true;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const clear = document.getElementById("clear");
    chips.insertBefore(button, clear || null);
  }

  function fixFinishedWithoutScore() {
    document.querySelectorAll(".result.finished").forEach(box => {
      const score = box.querySelector(".score");
      const pill = box.querySelector(".status-pill");
      const extra = box.querySelector(".result-extra");
      const text = (score?.textContent || "").trim().toLowerCase();

      if (text !== "finalizado") return;

      box.classList.remove("finished");
      box.classList.add("warning");

      if (score) {
        score.textContent = "Resultado por confirmar";
        score.classList.add("muted-score");
      }

      if (pill) {
        pill.textContent = "A aguardar golos";
      }

      if (extra && !extra.textContent.includes("golos ainda não chegaram")) {
        extra.textContent = `${extra.textContent} · golos ainda não chegaram da API`;
      }
    });
  }

  function start() {
    ensureResultsJumpButton();
    fixFinishedWithoutScore();

    const observer = new MutationObserver(() => {
      ensureResultsJumpButton();
      fixFinishedWithoutScore();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
