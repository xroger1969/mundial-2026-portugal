"use strict";

(function () {
  function ensureNavStyles() {
    if (document.getElementById("resultsNavStyles")) return;

    const style = document.createElement("style");
    style.id = "resultsNavStyles";
    style.textContent = `
      #resultsJump{border-color:#00C46A !important;background:linear-gradient(135deg, rgba(0,196,106,.22) 0%, rgba(30,35,44,.96) 58%, rgba(23,26,33,.96) 100%) !important;color:#FFFFFF !important;font-weight:900 !important}
      .livemode-quick-link{border-color:#00C46A !important;background:linear-gradient(135deg, rgba(0,196,106,.20) 0%, rgba(0,169,91,.14) 100%) !important;color:#FFFFFF !important;font-weight:900 !important;text-shadow:none !important}
      .livemode-quick-link:visited,.livemode-quick-link:hover,.livemode-quick-link:active{color:#FFFFFF !important}
      .back-top-wrap{margin:18px 0 4px;display:flex;justify-content:center}
      .back-top-button{border:1px solid #00C46A;background:linear-gradient(135deg, rgba(0,196,106,.22), rgba(30,35,44,.96));color:#FFFFFF;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer;width:100%;max-width:420px}
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

  function fixKoreaCzechiaResult() {
    const card = document.querySelector('article[data-num="2"]');
    if (!card) return;

    const resultBox = card.querySelector(".result");
    if (!resultBox || resultBox.dataset.manualScore === "true") return;

    const currentScore = (resultBox.querySelector(".score")?.textContent || "").trim().toLowerCase();
    const isStillPending = !currentScore || ["por disputar", "finalizado", "resultado por confirmar"].includes(currentScore);
    if (!isStillPending) return;

    resultBox.className = "result finished";
    resultBox.dataset.manualScore = "true";
    resultBox.innerHTML = `
      <div class="label">Resultado</div>
      <div class="result-line"><span class="score">2–1</span><span class="status-pill">Finalizado</span></div>
      <div class="result-extra">South Korea vs Czechia · resultado confirmado manualmente · Atualizado 12/06/2026, 07:45</div>
    `;

    const summaryBoxes = document.querySelectorAll("#summary .box");
    if (summaryBoxes[2]) {
      const value = summaryBoxes[2].querySelector("b");
      if (value && Number(value.textContent || 0) < 2) value.textContent = "2";
    }
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
    fixKoreaCzechiaResult();
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