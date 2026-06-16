"use strict";

(function () {
  if (window.__WC_ASSISTANT_TOPBAR_SAFE__) return;
  window.__WC_ASSISTANT_TOPBAR_SAFE__ = true;

  const STYLE_ID = "assistantTopbarSafeStyles";
  const TOPBAR_ID = "assistantTopbar";
  const TITLE = "Assistente Mundial 2026";
  const SUBTITLE = "Pergunta AI sobre jogos, resultados e tudo sobre o Mundial";
  const INTRO_TEXTS = [
    "Olá! Estou pronto, mas para falar com o Grok tens de abrir a versão Vercel do site. No GitHub Pages só consigo usar dados locais.",
    "Olá! Estou ligado ao assistente Grok. Posso responder a perguntas gerais e também usar os dados do calendário quando for útil."
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #assistantTopbar{margin:14px 0 16px;display:block}
      #assistantTopbar .assistant-top-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-radius:22px;border:1px solid rgba(0,196,106,.58);background:linear-gradient(135deg,rgba(0,196,106,.26),rgba(15,40,30,.96));color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.28);cursor:pointer;text-align:left}
      #assistantTopbar .assistant-top-main{display:flex;flex-direction:column;gap:3px;min-width:0}
      #assistantTopbar .assistant-top-title{font-size:1rem;font-weight:950;letter-spacing:.01em}
      #assistantTopbar .assistant-top-subtitle{font-size:.78rem;font-weight:650;color:rgba(255,255,255,.78)}
      #assistantTopbar .assistant-top-icon{width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:#00c46a;box-shadow:0 10px 24px rgba(0,196,106,.35);font-size:1.25rem;flex:0 0 auto}
      #mundialAssistantChat .assistant-toggle{display:none!important}
      #mundialAssistantChat .assistant-panel{left:10px!important;right:10px!important;bottom:calc(18px + env(safe-area-inset-bottom))!important;max-width:520px!important;width:auto!important;z-index:2200!important}
      body.assistant-chat-open #scrollTurboControl,body.assistant-chat-open #precisionScrollControl,body.assistant-chat-open #floatingScrollButton{opacity:0!important;pointer-events:none!important;transform:translateY(12px)!important}
      @media(max-width:520px){#mundialAssistantChat .assistant-panel{max-height:calc(100vh - 34px - env(safe-area-inset-bottom))!important}#mundialAssistantChat .assistant-messages{height:42vh!important;min-height:260px!important}}
    `;
    document.head.appendChild(style);
  }

  function removeIntroMessages() {
    document.querySelectorAll("#mundialAssistantChat .assistant-msg.bot").forEach(message => {
      const text = (message.textContent || "").trim();
      if (INTRO_TEXTS.includes(text)) message.remove();
    });
  }

  function updateTexts() {
    document.querySelectorAll("#mundialAssistantChat .assistant-title").forEach(el => { el.textContent = TITLE; });
    document.querySelectorAll("#mundialAssistantChat .assistant-subtitle").forEach(el => { el.textContent = SUBTITLE; });
    document.querySelectorAll("#assistantTopbar .assistant-top-title").forEach(el => { el.textContent = TITLE; });
    document.querySelectorAll("#assistantTopbar .assistant-top-subtitle").forEach(el => { el.textContent = SUBTITLE; });
  }

  function setOpenState() {
    const panel = document.querySelector("#mundialAssistantChat .assistant-panel");
    document.body.classList.toggle("assistant-chat-open", Boolean(panel && panel.classList.contains("open")));
  }

  function openAssistant() {
    const panel = document.querySelector("#mundialAssistantChat .assistant-panel");
    const toggle = document.querySelector("#mundialAssistantChat .assistant-toggle");
    const input = document.querySelector("#mundialAssistantChat .assistant-input");

    if (!panel && toggle) {
      toggle.click();
    } else if (panel && !panel.classList.contains("open")) {
      if (toggle) toggle.click();
      else panel.classList.add("open");
    }

    updateTexts();
    removeIntroMessages();
    setOpenState();
    setTimeout(() => input?.focus(), 100);
  }

  function createTopbar() {
    if (document.getElementById(TOPBAR_ID)) return;
    const header = document.querySelector("header");
    if (!header) return;

    const topbar = document.createElement("div");
    topbar.id = TOPBAR_ID;
    topbar.innerHTML = `
      <button type="button" class="assistant-top-btn" aria-label="Abrir Assistente Mundial 2026">
        <span class="assistant-top-main">
          <span class="assistant-top-title">${TITLE}</span>
          <span class="assistant-top-subtitle">${SUBTITLE}</span>
        </span>
        <span class="assistant-top-icon">💬</span>
      </button>
    `;
    header.appendChild(topbar);
    topbar.querySelector("button")?.addEventListener("click", openAssistant);
  }

  function wireClose() {
    const close = document.querySelector("#mundialAssistantChat .assistant-close");
    if (!close || close.dataset.safeTopbarReady) return;
    close.dataset.safeTopbarReady = "true";
    close.addEventListener("click", () => setTimeout(setOpenState, 60));
  }

  function apply() {
    injectStyles();
    createTopbar();
    updateTexts();
    removeIntroMessages();
    wireClose();
    setOpenState();
  }

  function start() {
    apply();
    let tries = 0;
    const timer = setInterval(() => {
      apply();
      tries += 1;
      if (tries > 20) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
