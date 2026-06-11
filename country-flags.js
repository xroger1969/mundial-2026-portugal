"use strict";

(function () {
  const FLAG_MAP = {
    "africa do sul": "🇿🇦",
    "alemanha": "🇩🇪",
    "argelia": "🇩🇿",
    "arabia saudita": "🇸🇦",
    "argentina": "🇦🇷",
    "australia": "🇦🇺",
    "austria": "🇦🇹",
    "belgica": "🇧🇪",
    "bosnia e herzegovina": "🇧🇦",
    "brasil": "🇧🇷",
    "cabo verde": "🇨🇻",
    "canada": "🇨🇦",
    "catar": "🇶🇦",
    "chequia": "🇨🇿",
    "colombia": "🇨🇴",
    "coreia do sul": "🇰🇷",
    "costa do marfim": "🇨🇮",
    "croacia": "🇭🇷",
    "curacao": "🇨🇼",
    "egito": "🇪🇬",
    "equador": "🇪🇨",
    "escocia": "🏴",
    "espanha": "🇪🇸",
    "estados unidos": "🇺🇸",
    "franca": "🇫🇷",
    "gana": "🇬🇭",
    "haiti": "🇭🇹",
    "inglaterra": "🏴",
    "irao": "🇮🇷",
    "iraque": "🇮🇶",
    "japao": "🇯🇵",
    "jordania": "🇯🇴",
    "marrocos": "🇲🇦",
    "mexico": "🇲🇽",
    "noruega": "🇳🇴",
    "nova zelandia": "🇳🇿",
    "paises baixos": "🇳🇱",
    "panama": "🇵🇦",
    "paraguai": "🇵🇾",
    "portugal": "🇵🇹",
    "rd congo": "🇨🇩",
    "senegal": "🇸🇳",
    "suecia": "🇸🇪",
    "suica": "🇨🇭",
    "tunisia": "🇹🇳",
    "turquia": "🇹🇷",
    "uruguai": "🇺🇾",
    "uzbequistao": "🇺🇿"
  };

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function flagFor(team) {
    return FLAG_MAP[norm(team)] || "";
  }

  function teamWithFlag(team) {
    const flag = flagFor(team);
    if (!flag) return escapeHtml(team);
    return `<span class="country-flag" aria-hidden="true">${flag}</span><span class="team-name-text">${escapeHtml(team)}</span>`;
  }

  function injectStyles() {
    if (document.getElementById("countryFlagStyles")) return;
    const style = document.createElement("style");
    style.id = "countryFlagStyles";
    style.textContent = `
      .country-flag{display:inline-block;margin-right:.38em;font-size:1.05em;line-height:1;vertical-align:-.08em}
      .match .country-flag{font-size:.95em;margin-right:.34em}
      .team-name-with-flag{white-space:nowrap}
      .standings-table .country-flag{margin-right:.32em}
    `;
    document.head.appendChild(style);
  }

  function decorateMatches() {
    document.querySelectorAll(".card .match").forEach(matchEl => {
      if (matchEl.dataset.flagsDone === "1") return;
      const text = matchEl.textContent || "";
      const parts = text.split(/\s+vs\s+/i).map(part => part.trim());
      if (parts.length !== 2) return;
      const [home, away] = parts;
      if (!flagFor(home) && !flagFor(away)) return;
      matchEl.innerHTML = `<span class="team-name-with-flag">${teamWithFlag(home)}</span> <span class="vs-text">vs</span> <span class="team-name-with-flag">${teamWithFlag(away)}</span>`;
      matchEl.dataset.flagsDone = "1";
    });
  }

  function decorateStandings() {
    document.querySelectorAll(".standings-table tbody td:nth-child(2) strong").forEach(teamEl => {
      if (teamEl.dataset.flagsDone === "1") return;
      const team = teamEl.textContent.trim();
      const flag = flagFor(team);
      if (!flag) return;
      teamEl.innerHTML = `${teamWithFlag(team)}`;
      teamEl.dataset.flagsDone = "1";
    });

    document.querySelectorAll(".third-row > span").forEach(rowEl => {
      if (rowEl.dataset.flagsDone === "1") return;
      const firstNode = Array.from(rowEl.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (!firstNode) return;
      const match = firstNode.textContent.match(/^(\s*\d+\.\s*)(.+?)(\s*)$/);
      if (!match) return;
      const team = match[2].trim();
      const flag = flagFor(team);
      if (!flag) return;
      firstNode.textContent = `${match[1]}${flag} ${team}${match[3]}`;
      rowEl.dataset.flagsDone = "1";
    });
  }

  function applyFlags() {
    injectStyles();
    decorateMatches();
    decorateStandings();
  }

  function startFlagEnhancer() {
    applyFlags();
    const observer = new MutationObserver(applyFlags);
    [document.getElementById("cards"), document.getElementById("standingsPanel")]
      .filter(Boolean)
      .forEach(target => observer.observe(target, { childList: true, subtree: true }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startFlagEnhancer);
  } else {
    startFlagEnhancer();
  }
}());
