"use strict";

// No GitHub Pages esta rota não existe. Na Vercel, /api/chat chama a função segura
// que usa a variável de ambiente XAI_API_KEY sem expor a chave no HTML.
window.WC_CHAT_API_URL = window.WC_CHAT_API_URL || "/api/chat";
