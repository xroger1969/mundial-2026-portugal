"use strict";

(function () {
  const WEATHER_FILE = "weather.json";
  const STYLE_ID = "weatherUiStyles";
  let weatherData = { matches: {} };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .weather-box{
        margin-top:8px;
        border:1px solid rgba(0,196,106,.38);
        border-radius:16px;
        padding:9px 10px;
        background:rgba(0,196,106,.08);
      }
      .weather-line{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        align-items:center;
        margin-top:5px;
      }
      .weather-chip{
        display:inline-flex;
        align-items:center;
        gap:4px;
        border:1px solid rgba(255,255,255,.14);
        border-radius:999px;
        padding:4px 8px;
        background:rgba(255,255,255,.07);
        color:#fff;
        font-size:.78rem;
        font-weight:850;
      }
      .weather-extra{
        margin-top:6px;
        color:#B8C0CC;
        font-size:.76rem;
        line-height:1.3;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value, suffix) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return `${Math.round(Number(value))}${suffix}`;
  }

  async function loadWeather() {
    try {
      const response = await fetch(`${WEATHER_FILE}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      weatherData = await response.json();
    } catch (error) {
      weatherData = { matches: {} };
    }
  }

  function weatherHtml(weather) {
    const temp = formatNumber(weather.temperatureC, "°C");
    const rain = formatNumber(weather.precipitationProbability, "%");
    const wind = formatNumber(weather.windKmh, " km/h");
    const icon = weather.icon || "🌡️";
    const description = weather.description || "Previsão disponível";

    return `<div class="weather-box" data-weather-ready="true">
      <div class="label">Tempo previsto no estádio</div>
      <div class="weather-line">
        <span class="weather-chip">${escapeHtml(icon)} ${escapeHtml(temp)}</span>
        <span class="weather-chip">Chuva ${escapeHtml(rain)}</span>
        <span class="weather-chip">Vento ${escapeHtml(wind)}</span>
      </div>
      <div class="weather-extra">${escapeHtml(description)} · Open-Meteo · previsão próxima do início do jogo</div>
    </div>`;
  }

  function applyWeatherToCards() {
    injectStyles();
    const matches = weatherData.matches || {};

    document.querySelectorAll("article.card[data-num]").forEach(card => {
      if (card.querySelector(".weather-box")) return;

      const weather = matches[String(card.dataset.num)];
      if (!weather || !weather.available) return;

      const venue = card.querySelector(".venue");
      if (!venue) return;

      venue.insertAdjacentHTML("afterend", weatherHtml(weather));
    });
  }

  async function start() {
    await loadWeather();
    applyWeatherToCards();

    const observer = new MutationObserver(applyWeatherToCards);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
