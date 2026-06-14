"use strict";

(function () {
  function ensureNavStyles() {
    if (document.getElementById("resultsNavStyles")) return;

    const style = document.createElement("style");
    style.id = "resultsNavStyles";
    style.textContent = `
      #resultsJump{
        border-color:var(--accent) !important;
        background:linear-gradient(135deg, rgba(0,196,106,.22), rgba(30,35,44,.96) 58%, rgba(23,26,33,.96)) !important;
        color:var(--ink) !important;
        font-weight:900 !important;
      }
      .livemode-quick-link{
        border-color:var(--accent) !important;
        background:linear-gradient(135deg, rgba(0,196,106,.20), rgba(0,169,91,.14)) !important;
        color:var(--ink) !important;
        font-weight:900 !important;
        text-shadow:none !important;
      }
      .livemode-quick-link:visited,
      .livemode-quick-link:hover,
      .livemode-quick-link:active{color:var(--ink) !important}
      .standings-inline-link{
        cursor:pointer !important;
        text-decoration:underline !important;
        text-decoration-thickness:1px !important;
        text-underline-offset:3px !important;
      }
      .standings-inline-link:active{transform:scale(.98)}
      .back-top-wrap{margin:18px 0 4px;display:flex;justify-content:center}
      .back-top-button{
        width:100%;
        max-width:420px;
        border:1px solid var(--accent);
        border-radius:999px;
        padding:12px 16px;
        background:linear-gradient(135deg, rgba(0,196,106,.22), rgba(30,35,44,.96));
        color:var(--ink);
        font-weight:900;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function openStandingsPanel(groupLetter) {
    const panel = document.getElementById("standingsPanel");
    if (!panel) return;

    const details = panel.querySelector("details");
    if (details) details.open = true;

    const groupSelect = document.getElementById("group");
    if (groupSelect) {
      groupSelect.value = groupLetter || "";
      groupSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    setTimeout(() => {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function ensureResultsJumpButton() {
    const chips = document.querySelector(".chips");
    if (!chips || document.getElementById("resultsJump")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "resultsJump";
    button.className = "chip";
    button.textContent = "Quadro geral de resultados e classificações";
    button.addEventListener("click", () => openStandingsPanel(""));

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

  function makeGroupTagsJumpToStandings() {
    document.querySelectorAll("article.card .tag").forEach(tag => {
      if (tag.dataset.standingsJumpReady === "true") return;

      const text = (tag.textContent || "").trim();
      const groupMatch = text.match(/^Grupo\s+([A-L])$/i);
      const isGroupStage = text.toLowerCase() === "fase de grupos";
      if (!groupMatch && !isGroupStage) return;

      tag.dataset.standingsJumpReady = "true";
      tag.classList.add("standings-inline-link");
      tag.setAttribute("role", "button");
      tag.setAttribute("tabindex", "0");
      tag.setAttribute(
        "title",
        groupMatch ? `Ver classificação do Grupo ${groupMatch[1].toUpperCase()}` : "Ver quadro geral de grupos"
      );

      const action = event => {
        event.preventDefault();
        event.stopPropagation();
        openStandingsPanel(groupMatch ? groupMatch[1].toUpperCase() : "");
      };

      tag.addEventListener("click", action);
      tag.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") action(event);
      });
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

  function parseCardKickoff(card) {
    const dateText = card.querySelector(".date")?.textContent || "";
    const timeText = card.querySelector(".time")?.textContent || "";
    const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/);
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);

    if (!dateMatch || !timeMatch) return null;

    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const date = new Date(2026, month, day, hour, minute, 0, 0);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function fixExpiredScheduledGames() {
    const now = new Date();
    const resultDelayLimit = 135 * 60 * 1000;

    document.querySelectorAll("article.card").forEach(card => {
      const resultBox = card.querySelector(".result");
      const score = resultBox?.querySelector(".score");
      const pill = resultBox?.querySelector(".status-pill");
      const extra = resultBox?.querySelector(".result-extra");
      const scoreText = (score?.textContent || "").trim().toLowerCase();

      if (!resultBox || scoreText !== "por disputar") return;

      const kickoff = parseCardKickoff(card);
      if (!kickoff || now - kickoff < resultDelayLimit) return;

      resultBox.classList.remove("scheduled");
      resultBox.classList.add("warning");
      resultBox.dataset.waitingApi = "true";

      score.textContent = "A aguardar resultado da API";
      if (pill) pill.textContent = "A aguardar API";
      if (extra && !extra.textContent.includes("API ainda sem golos")) {
        extra.textContent = `${extra.textContent} · API ainda sem golos`;
      }
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

      if (pill) pill.textContent = "A aguardar golos";

      if (extra && !extra.textContent.includes("golos ainda não chegaram")) {
        extra.textContent = `${extra.textContent} · golos ainda não chegaram da API`;
      }
    });
  }

  function applyUiFixes() {
    ensureNavStyles();
    ensureResultsJumpButton();
    ensureBackToTopButton();
    makeGroupTagsJumpToStandings();
    fixKoreaCzechiaResult();
    fixFinishedWithoutScore();
    fixExpiredScheduledGames();
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
