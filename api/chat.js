"use strict";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4";
const MAX_CONTEXT_CHARS = 9000;
const MAX_MESSAGES = 10;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(payload));
}

function cleanText(value, limit = 2500) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function safeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(message => message && ["user", "assistant"].includes(message.role))
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      content: cleanText(message.content, 2000)
    }))
    .filter(message => message.content);
}

function systemPrompt(context) {
  const safeContext = cleanText(context, MAX_CONTEXT_CHARS);

  return [
    "És um assistente útil integrado no site Calendário Mundial 2026 — Portugal.",
    "Responde sempre em português de Portugal, de forma clara, prática e simpática.",
    "Podes responder a qualquer tipo de pergunta.",
    "Quando a pergunta for sobre o Mundial 2026, usa o contexto do site quando estiver disponível.",
    "Se não tiveres dados suficientes sobre horários, canais, resultados, meteorologia ou notícias, diz isso de forma transparente.",
    "Não inventes resultados, canais ou previsões meteorológicas.",
    "Quando fizer sentido, dá respostas curtas e diretas, próprias para telemóvel.",
    safeContext ? `Contexto atual do site: ${safeContext}` : "Contexto atual do site: não foi enviado."
  ].join("\n");
}

function extractReply(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  return "";
}

function parseUpstreamPayload(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return { raw: cleanText(text, 900) };
  }
}

function upstreamErrorMessage(status, data) {
  const detail = data?.error?.message || data?.message || data?.raw || "Sem detalhe devolvido pela xAI.";

  if (status === 401) {
    return `Erro xAI 401: chave inválida ou mal colocada na Vercel. ${detail}`;
  }

  if (status === 403) {
    return `Erro xAI 403: a chave foi reconhecida, mas a xAI recusou o acesso. Verifica no painel da xAI se a API está ativa, se há créditos/billing e se o modelo tem acesso. Detalhe: ${detail}`;
  }

  if (status === 404) {
    return `Erro xAI 404: endpoint ou modelo não encontrado. Experimenta definir XAI_MODEL=grok-4 na Vercel. Detalhe: ${detail}`;
  }

  if (status === 429) {
    return `Erro xAI 429: limite de pedidos ou créditos atingido. Detalhe: ${detail}`;
  }

  return `Erro xAI ${status}: ${detail}`;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Método não permitido. Usa POST." });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: "Falta configurar XAI_API_KEY nas variáveis de ambiente da Vercel."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const messages = safeMessages(body.messages);
    const question = cleanText(body.question || body.message, 2000);
    const context = cleanText(body.context, MAX_CONTEXT_CHARS);
    const userMessages = messages.length ? messages : [{ role: "user", content: question }];

    if (!userMessages.length || !userMessages.some(message => message.role === "user" && message.content)) {
      return sendJson(res, 400, { error: "Pergunta em falta." });
    }

    const upstream = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt(context) },
          ...userMessages
        ],
        temperature: 0.4,
        max_tokens: 900
      })
    });

    const responseText = await upstream.text();
    const data = parseUpstreamPayload(responseText);

    if (!upstream.ok) {
      return sendJson(res, upstream.status, {
        error: upstreamErrorMessage(upstream.status, data)
      });
    }

    const reply = extractReply(data) || "Não recebi resposta do Grok.";
    return sendJson(res, 200, { reply });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Erro inesperado no chatbot." });
  }
};
