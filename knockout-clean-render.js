"use strict";

(function () {
  const PT_TEAM_NAMES = {
    "algeria": "Argélia",
    "argentina": "Argentina",
    "australia": "Austrália",
    "austria": "Áustria",
    "belgium": "Bélgica",
    "bosnia-herzegovina": "Bósnia e Herzegovina",
    "bosnia and herzegovina": "Bósnia e Herzegovina",
    "brazil": "Brasil",
    "canada": "Canadá",
    "cape verde": "Cabo Verde",
    "cape verde islands": "Cabo Verde",
    "colombia": "Colômbia",
    "congo dr": "RD Congo",
    "croatia": "Croácia",
    "ecuador": "Equador",
    "egypt": "Egito",
    "england": "Inglaterra",
    "france": "França",
    "germany": "Alemanha",
    "ghana": "Gana",
    "ivory coast": "Costa do Marfim",
    "japan": "Japão",
    "mexico": "México",
    "morocco": "Marrocos",
    "netherlands": "Países Baixos",
    "norway": "Noruega",
    "paraguay": "Paraguai",
    "portugal": "Portugal",
    "senegal": "Senegal",
    "south africa": "África do Sul",
    "spain": "Espanha",
    "sweden": "Suécia",
    "switzerland": "Suíça",
    "united states": "Estados Unidos"
  };

  const NEXT_GAME = {
    73: 90, 74: 89, 75: 90, 76: 91, 77: 89, 78: 91, 79: 92, 80: 92,
    81: 94, 82: 94, 83: 93, 84: 93, 85: 96, 86: 95, 87: 96, 88: 95,
    89: 97, 90: 97, 91: 99, 92: 99, 93: 98, 94: 98, 95: 100, 96: 100,
    97: 101, 98: 101, 99: 102, 100: 102, 101: 104, 102: 104
  };

  function safeNorm(value) {
    if (typeof norm === "function") return norm(value);
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  }

  function gameTimeValue(game) {
    const date = String(game && game.date ? game.date : "9999-12-31");
    const time = String(game && game.time ? game.time : "23:59");
    const value = new Date(`${date}T${time}:00`).getTime();
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
  }

  function sortGamesChronologically() {
    if (!Array.isArray(window.games) && !Array.isArray(games)) return;
    const list = Array.isArray(window.games) ? window.games : games;
    list.sort((a, b) => {
      const byTime = gameTimeValue(a) - gameTimeValue(b);
      if (byTime !== 0) return byTime;
      return Number(a && a.num || 0) - Number(b && b.num || 0);
    });
  }

  function isKnockout(game) {
    const n = Number(game && game.num);
    const stage = safeNorm(game && game.stage);
    return n >= 73 || stage.includes("avos") || stage.includes("oitavos") || stage.includes("quartos") || stage.includes("meias") || stage.includes("final");
  }

  function ptName(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const key = safeNorm(text);
    if (PT_TEAM_NAMES[key]) return PT_TEAM_NAMES[key];
    return text
      .replace(/^Winner Match\s+(\d+)$/i, "Vencedor $1")
      .replace(/^Loser Match\s+(\d+)$/i, "Vencido $1")
      .replace(/^Vencedor Jogo\s+(\d+)$/i, "Vencedor $1")
      .replace(/^Vencido Jogo\s+(\d+)$/i, "Vencido $1");
  }

  cleanMatchText = function (text) {
    return String(text || "")
      .replace(/Vencedor Jogo\s+(\d+)/g, "Vencedor $1")
      .replace(/Vencido Jogo\s+(\d+)/g, "Vencido $1")
      .replace(/2\.º Grupo/g, "2.º do Grupo")
      .replace(/Vencedor Grupo/g, "Vencedor do Grupo")
      .replace(/melhor 3\.º dos grupos/g, "melhor 3.º dos Grupos");
  };

  displayMatch = function (game) {
    const result = typeof getGameResult === "function" ? getGameResult(game) : null;
    if (isKnockout(game) && result && result.homeTeam && result.awayTeam) {
      return `${ptName(result.homeTeam)} vs ${ptName(result.awayTeam)}`;
    }
    return cleanMatchText(game && game.match);
  };

  progressionText = function (game) {
    if (!isKnockout(game)) return "";
    const n = Number(game && game.num);
    if (n === 104) return "Final do Mundial.";
    if (n === 103) return "Jogo de atribuição do 3.º lugar.";

    const result = typeof getGameResult === "function" ? getGameResult(game) : null;
    let winner = "";
    if (result && result.winner === "HOME_TEAM") winner = ptName(result.homeTeam);
    if (result && result.winner === "AWAY_TEAM") winner = ptName(result.awayTeam);

    if (n === 101 || n === 102) {
      return winner ? `${winner} segue para a Final. O vencido disputa o 3.º lugar.` : "Vencedor segue para a Final. Vencido disputa o 3.º lugar.";
    }

    const next = NEXT_GAME[n];
    if (!next) return "";
    return winner ? `${winner} segue para o Jogo ${next}.` : `Vencedor segue para o Jogo ${next}.`;
  };

  sortGamesChronologically();
  if (typeof renderCards === "function") renderCards();
})();
