"use strict";

(function () {
  const CHANNEL_LINKS = [
    {
      match: label => /\brtp\s*1\b/i.test(label),
      url: "https://www.rtp.pt/play/direto/rtp1",
      title: "Abrir RTP 1 em direto"
    },
    {
      match: label => /^\s*sic\s*$/i.test(label),
      url: "https://sic.pt/direto/",
      title: "Abrir SIC em direto"
    },
    {
      match: label => /^\s*tvi\s*$/i.test(label),
      url: "https://tvi.iol.pt/direto",
      title: "Abrir TVI em direto"
    },
    {
      match: label => /sport\s*tv/i.test(label),
      url: "https://www.sporttv.pt/",
      title: "Abrir Sport TV"
    },
    {
      match: label => /\bdazn\b/i.test(label),
      url: "https://www.dazn.com/pt-PT/home",
      title: "Abrir DAZN Portugal"
    }
  ];

  function findChannelLink(label) {
    return CHANNEL_LINKS.find(item => item.match(label));
  }

  function ensureStyles() {
    if (document.getElementById("channelOfficialLinksStyle")) return;

    const style = document.createElement("style");
    style.id = "channelOfficialLinksStyle";
    style.textContent = `
      .channel-list a.tag{
        text-decoration:none !important;
        cursor:pointer;
        font-weight:900;
        position:relative;
      }
      .channel-list a.tag::after{
        content:" ↗";
        font-size:.78em;
        opacity:.78;
      }
      .channel-list a.tag:active{
        transform:scale(.97);
      }
    `;
    document.head.appendChild(style);
  }

  function linkOfficialChannels() {
    ensureStyles();

    document.querySelectorAll(".channel-list .tag:not([data-channel-linked])").forEach(tag => {
      if (tag.tagName.toLowerCase() === "a") {
        tag.setAttribute("data-channel-linked", "true");
        return;
      }

      const label = (tag.textContent || "").trim();
      if (!label || /livemodetv/i.test(label)) return;

      const channel = findChannelLink(label);
      if (!channel) return;

      const link = document.createElement("a");
      link.className = tag.className;
      link.href = channel.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = channel.title;
      link.setAttribute("aria-label", channel.title);
      link.setAttribute("data-channel-linked", "true");
      link.textContent = label;

      tag.replaceWith(link);
    });
  }

  function start() {
    linkOfficialChannels();

    const cards = document.getElementById("cards");
    if (cards) {
      const observer = new MutationObserver(linkOfficialChannels);
      observer.observe(cards, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
