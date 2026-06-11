"use strict";

(function () {
  function ensureNavStyles() {
    if (document.getElementById("resultsNavStyles")) return;

    const style = document.createElement("style");
    style.id = "resultsNavStyles";
    style.textContent = `
      #resultsJump{border-color:rgba(232,200,74,.75);background:linear-gradient(135deg, rgba(232,200,74,.22), rgba(11,30,63,.88));font-weight:900}
      .back-top-wrap{margin:18px 0 4px;display:flex;justify-content:center}
      .back-top-button{border:1px solid rgba(232,200,74,.70);background:linear-gradient(135deg, rgba(232,200,74,.20), rgba(11,30,63,.90));color:var(--ink,#fff);border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;width:100%;max-width:420px}
    `;
    document.head.appendChild(style);
  }

  function ensureResultsJumpButton() {
    const chips = document.querySelector(".chips");
    if (!chips || document.getElementById("resultsJump")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "resultsJump";
    button.className = "chip";
    button.textContent = "Quadro geral de resultados e classificações";
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

  function ensureBackToTopButton() {
    const panel = document.getElementById("standingsPanel");
    if (!panel || document.getElementById("backToTopFromStandings")) return;

    const wrap = document.createElement("div");
    wrap.className = "back-top-wrap";
    wrap.innerHTML = `<button type="button" id="backToTopFromStandings" class="back-top-button">Voltar ao topo ↑</button>`;
    panel.after(wrap);

    wrap.querySelector("button").addEventListener("click", () => {
      document.querySelector("header")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  function applyUiFixes() {
    ensureNavStyles();
    ensureResultsJumpButton();
    ensureBackToTopButton();
    fixFinishedWithoutScore();
  }

  function start() {
    applyUiFixes();

    const observer = new MutationObserver(applyUiFixes);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
