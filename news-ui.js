"use strict";

(function () {
  const NEWS_FILE = "news.json";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function articleImage(article) {
    return article.image
      ? `<img class="news-image" src="${escapeHtml(article.image)}" alt="" loading="lazy">`
      : `<div class="news-image" aria-hidden="true"></div>`;
  }

  function renderArticles(articles) {
    if (!articles.length) {
      return `<div class="news-empty">Ainda não há notícias carregadas. Aguarda a próxima atualização automática.</div>`;
    }

    return `<div class="news-list">${articles.map(article => `
      <a class="news-card" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">
        ${articleImage(article)}
        <div class="news-copy">
          <h3 class="news-title">${escapeHtml(article.title || "Notícia do Mundial 2026")}</h3>
          ${article.description ? `<p class="news-desc">${escapeHtml(article.description)}</p>` : ""}
          <div class="news-meta">${escapeHtml(article.sourceName || "GNews")}${article.publishedAt ? ` · ${escapeHtml(formatDate(article.publishedAt))}` : ""}</div>
        </div>
      </a>
    `).join("")}</div>`;
  }

  async function loadNews() {
    try {
      const response = await fetch(`${NEWS_FILE}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return {
        status: "offline",
        message: "Não foi possível carregar as notícias neste momento.",
        articles: []
      };
    }
  }

  async function renderNewsPanel() {
    const cards = document.getElementById("cards");
    if (!cards || document.getElementById("newsPanel")) return;

    const panel = document.createElement("section");
    panel.id = "newsPanel";
    panel.className = "news-panel";
    panel.innerHTML = `<div class="news-empty">A carregar notícias do Mundial 2026...</div>`;
    cards.after(panel);

    const data = await loadNews();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const updated = data.updatedAt ? `Atualizado ${formatDate(data.updatedAt)}` : "GNews";

    panel.innerHTML = `
      <div class="news-head news-head-compact">
        <h2>Notícias do Mundial 2026</h2>
        <div class="news-status">${escapeHtml(updated)}</div>
      </div>
      ${renderArticles(articles)}
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderNewsPanel);
  } else {
    renderNewsPanel();
  }
}());
