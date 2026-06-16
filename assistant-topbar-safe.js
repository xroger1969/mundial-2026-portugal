"use strict";

(function () {
  if (window.__WC_ASSISTANT_LAYOUT_FIX__) return;
  window.__WC_ASSISTANT_LAYOUT_FIX__ = true;

  const STYLE_ID = "assistantLayoutFixStyles";
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
      #assistantTopbar{display:none!important}
      #mundialAssistantChat{position:static!important;left:auto!important;bottom:auto!important;margin:14px 0 16px!important;z-index:auto!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important}
      #mundialAssistantChat .assistant-toggle{width:100%!important;min-height:86px!important;border-radius:22px!important;border:1px solid rgba(0,196,106,.58)!important;background:linear-gradient(135deg,rgba(0,196,106,.26),rgba(15,40,30,.96))!important;color:#fff!important;box-shadow:0 12px 32px rgba(0,0,0,.28)!important;padding:15px 16px!important;text-align:left!important;font-size:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}
      #mundialAssistantChat .assistant-toggle::before{content:"Assistente Mundial 2026\A Pergunta AI sobre jogos, resultados e tudo sobre o Mundial";white-space:pre-line;font-size:1rem;line-height:1.25;font-weight:950!important}
      #mundialAssistantChat .assistant-toggle::after{content:"💬";width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:#00c46a;box-shadow:0 10px 24px rgba(0,196,106,.35);font-size:1.25rem;flex:0 0 auto}
      #mundialAssistantChat .assistant-panel{left:10px!important;right:10px!important;bottom:calc(18px + env(safe-area-inset-bottom))!important;max-width:520px!important;width:auto!important;z-index:2200!important}
      body.assistant-chat-open #scrollTurboControl,body.assistant-chat-open #precisionScrollControl,body.assistant-chat-open #floatingScrollButton{opacity:0!important;pointer-events:none!important;transform:translateY(12px)!important}
      body.assistant-chat-open #mundialAssistantChat .assistant-toggle{opacity:.2!important;pointer-events:none!important}
      @media(max-width:520px){#mundialAssistantChat .assistant-panel{max-height:calc(100vh - 34px - env(safe-area-inset-bottom))!important}#mundialAssistantChat .assistant-messages{height:42vh!important;min-height:260px!important}}
    `;
    document.head.appendChild(style);
  }

  function moveAssistantToHeader() {
    const root = document.getElementById("mundialAssistantChat");
    const header = document.querySelector("header");
    if (!root || !header) return;
    if (root.parentElement !== header) header.appendChild(root);
  }

  function updateTexts() {
    document.querySelectorAll("#mundialAssistantChat .assistant-title").forEach(el => { el.textContent = TITLE; });
    document.querySelectorAll("#mundialAssistantChat .assistant-subtitle").forEach(el => { el.textContent = SUBTITLE; });
  }

  function removeIntroMessages() {
    document.querySelectorAll("#mundialAssistantChat .assistant-msg.bot").forEach(message => {
      const text = (message.textContent || "").trim();
      if (INTRO_TEXTS.includes(text)) message.remove();
    });
  }

  function setOpenState() {
    const panel = document.querySelector("#mundialAssistantChat .assistant-panel");
    document.body.classList.toggle("assistant-chat-open", Boolean(panel && panel.classList.contains("open")));
  }

  function wireButtons() {
    const toggle = document.querySelector("#mundialAssistantChat .assistant-toggle");
    if (toggle && !toggle.dataset.layoutFixReady) {
      toggle.dataset.layoutFixReady = "true";
      toggle.addEventListener("click", () => setTimeout(() => {
        updateTexts();
        removeIntroMessages();
        setOpenState();
      }, 50));
    }

    const close = document.querySelector("#mundialAssistantChat .assistant-close");
    if (close && !close.dataset.layoutFixReady) {
      close.dataset.layoutFixReady = "true";
      close.addEventListener("click", () => setTimeout(setOpenState, 70));
    }
  }

  function apply() {
    injectStyles();
    moveAssistantToHeader();
    updateTexts();
    removeIntroMessages();
    wireButtons();
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}());
