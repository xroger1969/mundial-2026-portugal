"use strict";

const LIVEMODE_YOUTUBE_URL = "https://www.youtube.com/results?search_query=LiveModeTV%20Mundial%202026";

function ensureLiveModeQuickLink() {
  const filters = document.querySelector(".filters");
  if (!filters || document.querySelector(".livemode-row")) return;

  const row = document.createElement("div");
  row.className = "livemode-row";
  row.innerHTML = `<a class="livemode-quick-link" href="${LIVEMODE_YOUTUBE_URL}" target="_blank" rel="noopener noreferrer" aria-label="Abrir LiveModeTV no YouTube">Abrir LiveModeTV no YouTube ↗</a><span>O botão “Grátis / LiveModeTV” serve para filtrar os jogos gratuitos.</span>`;
  filters.appendChild(row);
}

function makeLiveModeLinks() {
  const tags = document.querySelectorAll(".channel-list .tag.live:not([data-linked])");

  tags.forEach(tag => {
    const text = tag.textContent || "";
    if (!text.toLowerCase().includes("livemodetv")) return;

    const link = document.createElement("a");
    link.className = tag.className;
    link.href = LIVEMODE_YOUTUBE_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "Abrir LiveModeTV no YouTube";
    link.setAttribute("aria-label", "Abrir LiveModeTV no YouTube");
    link.setAttribute("data-linked", "true");
    const label = text.includes("YouTube") ? text : `${text} (YouTube)`;
    link.textContent = label.includes("↗") ? label : `${label} ↗`;
    link.style.textDecoration = "none";
    link.style.fontWeight = "900";
    link.style.cursor = "pointer";

    tag.replaceWith(link);
  });
}

function startLiveModeLinks() {
  ensureLiveModeQuickLink();
  makeLiveModeLinks();

  const cards = document.getElementById("cards");
  if (cards) {
    const observer = new MutationObserver(makeLiveModeLinks);
    observer.observe(cards, { childList: true, subtree: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startLiveModeLinks);
} else {
  startLiveModeLinks();
}
