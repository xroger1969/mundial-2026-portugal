"use strict";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-6-astra";
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
    "És um assistente de IA integrado no site Calendário Mundial 2026 — Portugal.",
    "Responde sempre em português de Portugal, de forma clara, prática e simpática.",
    "Podes responder a qualquer tipo de pergunta, não apenas sobre o calendário.",
    "Não digas que só tens horários, canais e meteorologia. O contexto do site é uma ajuda, não uma limitação.",
    "Quando a pergunta for sobre o Mundial 2026, usa primeiro o contexto do site para horários, canais, resultados, grupos, estádios e meteorologia.",
    "Quando a pergunta for sobre temas fora do site, responde com conhecimento geral e bom senso.",
    "Se a pergunta pedir uma equipa provável, onze provável, convocatória provável ou análise desportiva, responde como previsão/estimativa e deixa claro que não é informação oficial confirmada.",
    "Não inventes resultados finais, canais de TV confirmados ou previsões meteorológicas como se fossem oficiais.",
    "Se não tiveres dados atuais suficientes, diz isso com honestidade, mas tenta ajudar com uma análise provável, cenários ou próximos passos.",
    "Quando fizer sentido, dá respostas curtas e diretas, próprias para telemóvel.",
    safeContext ? `Contexto atual do site: ${safeContext}` : "Contexto atual do site: não foi enviado."
  ].join("\n");
}

function extractReply(data) {
  if (data?.status !== "completed") return "";
  return (data.output || []).filter(item => item.type === "message")
    .flatMap(item => item.content || []).filter(part => part.type === "output_text")
    .map(part => part.text || "").join(" ").trim();
}

function parseUpstreamPayload(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return { raw: cleanText(text, 900) };
  }
}

function upstreamErrorMessage(status) {
  if (status === 401 || status === 403) return "Não foi possível autenticar o serviço de IA.";
  if (status === 404) return "O modelo de IA configurado não está disponível nesta conta.";
  if (status === 429) return "O serviço de IA atingiu temporariamente o limite de utilização.";
  return "Não foi possível obter uma resposta da IA. Tenta novamente.";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Método não permitido. Usa POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: "A ligação OpenAI ainda não está configurada no servidor."
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

    const upstream = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          { role: "system", content: systemPrompt(context) },
          ...userMessages
        ],
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: 3072
      })
    });

    const responseText = await upstream.text();
    const data = parseUpstreamPayload(responseText);

    if (!upstream.ok) {
      return sendJson(res, upstream.status, {
        error: upstreamErrorMessage(upstream.status, data)
      });
    }

    const reply = extractReply(data);
    if (!reply) return sendJson(res, 502, { error: "A IA não devolveu uma resposta completa." });
    return sendJson(res, 200, { reply, model: data.model || null });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Erro inesperado no chatbot." });
  }
};
