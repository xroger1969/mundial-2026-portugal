"use strict";

const LIVEMODE_YOUTUBE_URL = "https://www.youtube.com/results?search_query=LiveModeTV";

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
    link.textContent = text.includes("↗") ? text : `${text} ↗`;
    link.style.textDecoration = "none";
    link.style.fontWeight = "900";
    link.style.cursor = "pointer";

    tag.replaceWith(link);
  });
}

const cards = document.getElementById("cards");
if (cards) {
  const observer = new MutationObserver(makeLiveModeLinks);
  observer.observe(cards, { childList: true, subtree: true });
}

makeLiveModeLinks();
