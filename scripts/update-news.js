/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NEWS_PATH = path.join(ROOT, "news.json");
const API_URL = "https://gnews.io/api/v4/search";
const QUERY = "Mundial 2026 futebol Portugal";

function readExistingNews() {
  try {
    return JSON.parse(fs.readFileSync(NEWS_PATH, "utf8"));
  } catch {
    return { articles: [] };
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseArticle(article) {
  return {
    title: cleanText(article.title),
    description: cleanText(article.description),
    content: cleanText(article.content),
    url: article.url || "",
    image: article.image || "",
    publishedAt: article.publishedAt || null,
    sourceName: article.source?.name || "",
    sourceUrl: article.source?.url || ""
  };
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter(article => {
    const key = article.url || article.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function writeNews(payload) {
  const finalPayload = {
    provider: "gnews.io",
    topic: "Mundial 2026",
    ...payload,
    articles: payload.articles || []
  };

  fs.writeFileSync(NEWS_PATH, `${JSON.stringify(finalPayload, null, 2)}\n`, "utf8");
}

async function main() {
  const token = process.env.GNEWS_API_KEY;
  const previous = readExistingNews();

  if (!token) {
    writeNews({
      status: "waiting_for_api_key",
      updatedAt: previous.updatedAt || null,
      message: "Falta configurar o segredo GNEWS_API_KEY no GitHub.",
      articles: previous.articles || []
    });
    console.log("GNEWS_API_KEY não está configurada.");
    return;
  }

  const url = new URL(API_URL);
  url.searchParams.set("q", QUERY);
  url.searchParams.set("lang", "pt");
  url.searchParams.set("country", "pt");
  url.searchParams.set("max", "10");
  url.searchParams.set("apikey", token);

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    writeNews({
      status: "api_error",
      updatedAt: previous.updatedAt || null,
      message: `Erro na API GNews: HTTP ${response.status}`,
      lastError: body.slice(0, 500),
      articles: previous.articles || []
    });
    console.log(`Erro na API GNews: HTTP ${response.status}`);
    return;
  }

  const data = await response.json();
  const articles = dedupeArticles((data.articles || []).map(normaliseArticle))
    .slice(0, 10);

  writeNews({
    status: "ok",
    updatedAt: new Date().toISOString(),
    message: `Notícias atualizadas automaticamente. Artigos recebidos: ${articles.length}.`,
    query: QUERY,
    totalArticles: data.totalArticles || articles.length,
    articles
  });

  console.log(`Notícias atualizadas. Artigos: ${articles.length}.`);
}

main().catch(error => {
  const previous = readExistingNews();
  writeNews({
    status: "script_error",
    updatedAt: previous.updatedAt || null,
    message: `Erro no script de notícias: ${error.message}`,
    articles: previous.articles || []
  });
  console.error(error);
});
