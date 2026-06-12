"use strict";

(function () {
  function ensureNavStyles() {
    if (document.getElementById("resultsNavStyles")) return;

    const style = document.createElement("style");
    style.id = "resultsNavStyles";
    style.textContent = `
      #resultsJump{border-color:#D79B28 !important;background:linear-gradient(135deg, #FFF4CC 0%, #EAF2FF 58%, #D8E7FA 100%) !important;color:#14345D !important;font-weight:900 !important}
      .livemode-quick-link{border-color:#D79B28 !important;background:linear-gradient(135deg, #FFF4CC 0%, #FFE7D6 100%) !important;color:#14345D !important;font-weight:900 !important;text-shadow:none !important}
      .livemode-quick-link:visited,.livemode-quick-link:hover,.livemode-quick-link:active{color:#14345D !important}
      .back-top-wrap{margin:18px 0 4px;display:flex;justify-content:center}
      .back-top-button{border:1px solid #D79B28;background:linear-gradient(135deg, #FFF4CC, #EAF2FF);color:#14345D;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;width:100%;max-width:420px}
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
