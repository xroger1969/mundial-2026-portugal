"use strict";

(function () {
  const CHAT_ID = "mundialAssistantChat";
  const STYLE_ID = "mundialAssistantChatStyles";
  const BACKEND_URL = window.WC_CHAT_API_URL || "";

  let resultsData = { matches: {} };
  let weatherData = { matches: {} };
  let newsData = { items: [] };

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
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

  function games() {
    return (window.WC2026_PARTS || []).flat().map(row => ({
      num: row[0],
      date: row[1],
      time: row[2],
      match: row[3],
      channels: row[4],
      stage: row[5],
      group: row[6],
      round: row[7],
      venue: row[8],
      portugal: Boolean(row[9]),
      free: Boolean(row[10]),
      open: Boolean(row[11]),
      notes: row[12] || ""
    })).sort((a, b) => a.num - b.num);
  }

  function kickoff(game) {
    const date = new Date(`${game.date}T${game.time}:00+01:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatGame(game) {
    const result = resultFor(game);
    const score = result && result.homeScore != null && result.awayScore != null
      ? ` · Resultado ${result.homeScore}–${result.awayScore}`
      : "";
    return `Jogo ${game.num}: ${game.match} — ${game.date} às ${game.time}, ${game.venue}. TV: ${game.channels}${score}`;
  }

  function resultFor(game) {
    const matches = resultsData.matches || {};
    return matches[String(game.num)] || null;
  }

  function isFinished(game) {
    return norm(resultFor(game)?.status) === "finished";
  }

  async function loadJson(file, fallback) {
    try {
      const response = await fetch(`${file}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return fallback;
    }
  }

  async function loadData() {
    resultsData = await loadJson("results.json", { matches: {} });
    weatherData = await loadJson("weather.json", { matches: {} });
    newsData = await loadJson("news.json", { items: [] });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CHAT_ID}{position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:220;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
      .assistant-toggle{width:auto;min-height:46px;border-radius:999px;border:1px solid rgba(0,196,106,.76);background:linear-gradient(135deg,#00c46a,#00a95b);color:#fff;font-weight:950;padding:10px 14px;box-shadow:0 12px 28px rgba(0,0,0,.34);cursor:pointer}
      .assistant-panel{position:fixed;left:10px;right:10px;bottom:calc(72px + env(safe-area-inset-bottom));max-width:430px;margin:auto;background:#171a21;border:1px solid #2a313d;border-radius:22px;box-shadow:0 20px 46px rgba(0,0,0,.42);overflow:hidden;display:none;color:#fff}
      .assistant-panel.open{display:block}
      .assistant-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;background:linear-gradient(135deg,rgba(0,196,106,.22),rgba(30,35,44,.96));border-bottom:1px solid #2a313d}
      .assistant-title{font-weight:950;line-height:1.1}.assistant-subtitle{font-size:.76rem;color:#b8c0cc;margin-top:2px}.assistant-close{width:36px;min-height:36px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;cursor:pointer}
      .assistant-messages{height:310px;overflow:auto;padding:12px;background:#0f1115;display:flex;flex-direction:column;gap:8px}
      .assistant-msg{max-width:88%;padding:10px 11px;border-radius:14px;font-size:.9rem;line-height:1.35;white-space:pre-line}.assistant-msg.bot{align-self:flex-start;background:#1e232c;border:1px solid #2a313d}.assistant-msg.user{align-self:flex-end;background:#00a95b;color:#fff}
      .assistant-suggestions{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;border-top:1px solid #2a313d;background:#171a21}.assistant-suggestion{width:auto;min-height:34px;white-space:nowrap;border-radius:999px;border:1px solid #2a313d;background:rgba(255,255,255,.06);color:#fff;font-size:.78rem;padding:7px 10px;cursor:pointer}
      .assistant-form{display:flex;gap:8px;padding:10px;background:#171a21;border-top:1px solid #2a313d}.assistant-input{flex:1;min-height:42px;border-radius:14px;border:1px solid #2a313d;background:#0f1115;color:#fff;padding:10px;font-size:16px}.assistant-send{width:auto;min-height:42px;border-radius:14px;border:1px solid rgba(0,196,106,.70);background:#00a95b;color:#fff;font-weight:900;padding:9px 12px;cursor:pointer}
      @media(min-width:520px){.assistant-panel{left:16px;right:auto;margin:0;width:430px}.assistant-messages{height:360px}}
    `;
    document.head.appendChild(style);
  }

  function addMessage(sender, text) {
    const messages = document.querySelector(`#${CHAT_ID} .assistant-messages`);
    const div = document.createElement("div");
    div.className = `assistant-msg ${sender}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function findGamesByQuery(query) {
    const q = norm(query);
    return games().filter(game => norm([
      game.match,
      game.channels,
      game.stage,
      game.group,
      game.venue,
      game.notes
    ].join(" ")).includes(q));
  }

  function nextGames(list, count = 4) {
    const now = new Date();
    return list
      .filter(game => {
        const time = kickoff(game);
        return time && time >= now;
      })
      .sort((a, b) => kickoff(a) - kickoff(b))
      .slice(0, count);
  }

  function lastFinished(count = 5) {
    return games()
      .filter(isFinished)
      .sort((a, b) => b.num - a.num)
      .slice(0, count);
  }

  function weatherLine(game) {
    const weather = (weatherData.matches || {})[String(game.num)];
    if (!weather || !weather.available) return "Ainda não tenho previsão meteorológica disponível para esse jogo.";
    return `${game.match}: ${weather.icon || "🌡️"} ${Math.round(weather.temperatureC)}°C, chuva ${Math.round(weather.precipitationProbability)}%, vento ${Math.round(weather.windKmh)} km/h — ${weather.description}, ${weather.city}.`;
  }

  function localAnswer(message) {
    const q = norm(message);
    const all = games();

    if (q.includes("portugal") || q.includes("rd congo") || q.includes("congo")) {
      const portugal = all.filter(game => game.portugal || norm(game.match).includes("portugal"));
      const next = nextGames(portugal, 3);
      if (q.includes("tempo") || q.includes("meteorolog") || q.includes("chuva")) {
        return next.length ? weatherLine(next[0]) : "Não encontrei próximos jogos de Portugal com previsão disponível.";
      }
      return next.length
        ? `Próximos jogos de Portugal:\n${next.map(formatGame).join("\n\n")}`
        : `Jogos de Portugal:\n${portugal.map(formatGame).join("\n\n")}`;
    }

    if (q.includes("resultado") || q.includes("acabou") || q.includes("finalizado") || q.includes("marcador")) {
      const finished = lastFinished(6);
      return finished.length
        ? `Últimos resultados:\n${finished.map(formatGame).join("\n\n")}`
        : "Ainda não tenho resultados finalizados carregados.";
    }

    if (q.includes("sinal aberto") || q.includes("rtp") || q.includes("sic") || q.includes("tvi")) {
      const openGames = nextGames(all.filter(game => game.open), 6);
      return openGames.length
        ? `Próximos jogos em sinal aberto:\n${openGames.map(formatGame).join("\n\n")}`
        : "Não encontrei próximos jogos em sinal aberto.";
    }

    if (q.includes("livemode") || q.includes("youtube") || q.includes("gratis") || q.includes("grátis")) {
      const freeGames = nextGames(all.filter(game => game.free || norm(game.channels).includes("livemodetv")), 6);
      return freeGames.length
        ? `Próximos jogos grátis / LiveModeTV:\n${freeGames.map(formatGame).join("\n\n")}`
        : "Não encontrei próximos jogos grátis / LiveModeTV.";
    }

    if (q.includes("tempo") || q.includes("meteorolog") || q.includes("chuva") || q.includes("vento")) {
      const withWeather = nextGames(all.filter(game => (weatherData.matches || {})[String(game.num)]), 4);
      return withWeather.length
        ? `Previsão disponível:\n${withWeather.map(weatherLine).join("\n\n")}`
        : "Ainda não há previsão meteorológica disponível. A Open-Meteo só cobre os jogos dentro da janela de previsão.";
    }

    if (q.includes("grupo") || q.includes("classificacao") || q.includes("classificação")) {
      const team = all.find(game => q.split(" ").some(word => word.length > 3 && norm(game.match).includes(word)));
      if (team?.group) return `${team.match} pertence ao Grupo ${team.group}. Podes tocar na etiqueta “Grupo ${team.group}” no cartão para ir ao quadro de classificações.`;
      return "Posso ajudar com grupos. Escreve, por exemplo: “grupo de Portugal” ou toca na etiqueta do grupo em qualquer jogo.";
    }

    const candidates = findGamesByQuery(message).slice(0, 5);
    if (candidates.length) {
      return `Encontrei estes jogos relacionados:\n${candidates.map(formatGame).join("\n\n")}`;
    }

    return "Posso ajudar com: próximos jogos de Portugal, onde ver na TV, jogos em sinal aberto, LiveModeTV, resultados, meteorologia e grupos. Experimenta: “Quando joga Portugal?”";
  }

  async function backendAnswer(message) {
    if (!BACKEND_URL) return null;
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.reply || data.message || null;
    } catch (error) {
      return null;
    }
  }

  async function handleSend(text) {
    const message = text.trim();
    if (!message) return;
    addMessage("user", message);
    const pending = addMessage("bot", "A procurar nos dados do Mundial...");
    const external = await backendAnswer(message);
    pending.textContent = external || localAnswer(message);
  }

  function mount() {
    injectStyles();
    if (document.getElementById(CHAT_ID)) return;

    const root = document.createElement("div");
    root.id = CHAT_ID;
    root.innerHTML = `
      <button type="button" class="assistant-toggle">💬 Assistente</button>
      <section class="assistant-panel" aria-label="Assistente Mundial 2026">
        <div class="assistant-head">
          <div><div class="assistant-title">Assistente Mundial 2026</div><div class="assistant-subtitle">Horários, TV, resultados, tempo e grupos</div></div>
          <button type="button" class="assistant-close" aria-label="Fechar">×</button>
        </div>
        <div class="assistant-messages"></div>
        <div class="assistant-suggestions">
          <button type="button" class="assistant-suggestion">Quando joga Portugal?</button>
          <button type="button" class="assistant-suggestion">Jogos em sinal aberto</button>
          <button type="button" class="assistant-suggestion">Resultados</button>
          <button type="button" class="assistant-suggestion">Tempo no estádio</button>
        </div>
        <form class="assistant-form">
          <input class="assistant-input" type="text" placeholder="Pergunta sobre o Mundial..." autocomplete="off">
          <button class="assistant-send" type="submit">Enviar</button>
        </form>
      </section>
    `;
    document.body.appendChild(root);

    const panel = root.querySelector(".assistant-panel");
    const input = root.querySelector(".assistant-input");

    root.querySelector(".assistant-toggle").addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && !panel.dataset.welcomed) {
        panel.dataset.welcomed = "true";
        addMessage("bot", "Olá! Sou o assistente do calendário. Pergunta-me por jogos, TV, resultados, tempo ou grupos.");
      }
      setTimeout(() => input.focus(), 80);
    });

    root.querySelector(".assistant-close").addEventListener("click", () => panel.classList.remove("open"));

    root.querySelector(".assistant-form").addEventListener("submit", event => {
      event.preventDefault();
      const value = input.value;
      input.value = "";
      handleSend(value);
    });

    root.querySelectorAll(".assistant-suggestion").forEach(button => {
      button.addEventListener("click", () => handleSend(button.textContent || ""));
    });
  }

  async function start() {
    await loadData();
    mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
