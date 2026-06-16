"use strict";

// Mantém o site público no GitHub Pages, mas envia as perguntas para a função segura da Vercel.
// A chave XAI_API_KEY fica protegida na Vercel e nunca aparece no HTML/JavaScript público.
window.WC_CHAT_API_URL = "https://mundial-2026-portugal.vercel.app/api/chat";
