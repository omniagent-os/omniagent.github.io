import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { startKeyRotator, getRotatorStatus } from "./keyRotator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ────────────────────────────────────────────
try {
  const envContent = readFileSync(join(__dirname, ".env"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env absent — use real env vars */ }

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const PEKPIK_BASE = "https://aiapiv2.pekpik.com/v1";

app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

/* ─── Retryable HTTP codes ────────────────────────────────
 * 401 = expired/invalid key → try next key/provider
 * 402 = quota/billing → try free alternative
 * 403 = forbidden (key has no access to this model)
 * 404 = model not found
 * 429 = rate limited
 * 500/502/503 = server errors
 ─────────────────────────────────────────────────────────── */
const RETRYABLE_CODES = new Set([401, 402, 403, 404, 429, 500, 502, 503]);

function isRetryable(err) {
  const m = err.message.match(/HTTP (\d{3})/);
  return m ? RETRYABLE_CODES.has(Number(m[1])) : false;
}

/* ─── Fallback chains ─────────────────────────────────────
 * Groq is first because it's the most reliable free provider.
 * pekpik is secondary (free keys expire frequently).
 ─────────────────────────────────────────────────────────── */
const FALLBACK_CHAINS = {
  google: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "groq",    model: "llama-3.1-8b-instant" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "gemini-2.5-flash" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  deepseek: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "deepseek-chat" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  xai: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "grok-3" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  kimi: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "kimi-k2.5" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  pekpik: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "groq",    model: "gemma2-9b-it" },
    { providerId: "pekpik",  model: "gpt-5.4" },
    { providerId: "pekpik",  model: "claude-opus-4-7" },
  ],
  groq: [
    { providerId: "groq",    model: "llama-3.1-8b-instant" },
    { providerId: "groq",    model: "gemma2-9b-it" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  cerebras: [
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "cerebras",model: "llama-4-scout-17b-16e-instruct" },
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  mistral: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  openai: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "gpt-5.4" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
  anthropic: [
    { providerId: "groq",    model: "llama-3.3-70b-versatile" },
    { providerId: "cerebras",model: "llama3.1-8b" },
    { providerId: "pekpik",  model: "claude-opus-4-7" },
    { providerId: "pekpik",  model: "smart-chat" },
  ],
};

/* ─── Low-level provider call ─────────────────────────── */
async function callProvider(providerId, model, messages) {
  switch (providerId) {
    case "openai":
      return callOpenAICompat("https://api.openai.com/v1/chat/completions",
        process.env.OPENAI_API_KEY, "OpenAI", model, messages);
    case "anthropic":
      return callAnthropic(model, messages);
    case "google":
      return callGoogle(model, messages);
    case "mistral":
      return callOpenAICompat("https://api.mistral.ai/v1/chat/completions",
        process.env.MISTRAL_API_KEY, "Mistral", model, messages);
    case "deepseek":
      return callOpenAICompat("https://api.deepseek.com/chat/completions",
        process.env.DEEPSEEK_API_KEY, "DeepSeek", model, messages);
    case "groq":
      return callOpenAICompat("https://api.groq.com/openai/v1/chat/completions",
        process.env.GROQ_API_KEY, "Groq", model, messages);
    case "cerebras":
      return callOpenAICompat("https://api.cerebras.ai/v1/chat/completions",
        process.env.CEREBRAS_API_KEY, "Cerebras", model, messages);
    case "pekpik":
      return callOpenAICompat(`${PEKPIK_BASE}/chat/completions`,
        process.env.PEKPIK_API_KEY, "FreeLLM Hub", model, messages);
    case "xai":
      return callOpenAICompat(`${PEKPIK_BASE}/chat/completions`,
        process.env.XAI_API_KEY, "xAI Grok", model, messages);
    case "kimi":
      return callOpenAICompat(`${PEKPIK_BASE}/chat/completions`,
        process.env.KIMI_API_KEY, "Kimi", model, messages);
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/* ─── Call with automatic fallback ──────────────────────── */
async function callWithFallback(originalProviderId, originalModel, messages) {
  try {
    const content = await callProvider(originalProviderId, originalModel, messages);
    return { content, usedModel: originalModel, usedProvider: originalProviderId, fallbackUsed: false };
  } catch (primaryErr) {
    if (!isRetryable(primaryErr)) throw primaryErr;
    const code = primaryErr.message.match(/HTTP \d+/)?.[0] ?? "error";
    console.warn(`[${originalProviderId}/${originalModel}] Primary failed (${code}) — trying fallbacks…`);
  }

  const chain = (FALLBACK_CHAINS[originalProviderId] ?? []).filter(
    (fb) => !(fb.providerId === originalProviderId && fb.model === originalModel)
  );

  const keyMap = {
    openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY, mistral: process.env.MISTRAL_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY, groq: process.env.GROQ_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY, pekpik: process.env.PEKPIK_API_KEY,
    xai: process.env.XAI_API_KEY, kimi: process.env.KIMI_API_KEY,
  };

  for (const fallback of chain) {
    if (!keyMap[fallback.providerId]) continue;
    try {
      const content = await callProvider(fallback.providerId, fallback.model, messages);
      console.log(`[${originalProviderId}] ✓ Fallback → ${fallback.providerId}/${fallback.model}`);
      return {
        content, usedModel: fallback.model, usedProvider: fallback.providerId,
        fallbackUsed: true, originalModel, originalProvider: originalProviderId,
      };
    } catch (fbErr) {
      console.warn(`[${originalProviderId}] Fallback ${fallback.providerId}/${fallback.model} failed: ${fbErr.message.match(/HTTP \d+/)?.[0] ?? "err"}`);
    }
  }

  throw new Error(`[${originalProviderId}] All fallbacks exhausted.`);
}

/* ─── Health & Status ─────────────────────────────────── */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/status", (_req, res) => {
  const providers = {
    openai:    !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google:    !!process.env.GOOGLE_API_KEY,
    mistral:   !!process.env.MISTRAL_API_KEY,
    deepseek:  !!process.env.DEEPSEEK_API_KEY,
    groq:      !!process.env.GROQ_API_KEY,
    cerebras:  !!process.env.CEREBRAS_API_KEY,
    pekpik:    !!process.env.PEKPIK_API_KEY,
    xai:       !!process.env.XAI_API_KEY,
    kimi:      !!process.env.KIMI_API_KEY,
  };
  res.json({ providers });
});

app.get("/api/keys-status", (_req, res) => res.json(getRotatorStatus()));

/* ─── Proxy (with automatic fallback) ────────────────── */
app.post("/api/proxy", async (req, res) => {
  const { providerId, model, messages } = req.body;
  if (!providerId || !model || !messages)
    return res.status(400).json({ error: "Missing providerId, model or messages" });
  try {
    const result = await callWithFallback(providerId, model, messages);
    res.json(result);
  } catch (err) {
    console.error(`[${providerId}] All attempts failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Provider helpers ────────────────────────────────── */

async function callOpenAICompat(endpoint, apiKey, name, model, messages) {
  if (!apiKey) throw new Error(`${name} HTTP 401: API key not configured`);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${name} HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(model, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic HTTP 401: API key not configured");
  const system = messages.find((m) => m.role === "system");
  const chat   = messages.filter((m) => m.role !== "system");
  const body   = { model, max_tokens: 4096, messages: chat };
  if (system) body.system = system.content;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callGoogle(model, messages) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Google HTTP 401: API key not configured");
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages.filter((m) => m.role !== "system");
  let contents = chatMsgs.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  if (systemMsg) {
    contents = [
      { role: "user",  parts: [{ text: systemMsg.content }] },
      { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
      ...contents,
    ];
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents }) }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Google HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

/* ─── Start ───────────────────────────────────────────── */
app.listen(PORT, () => {
  const keyMap = {
    openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY, mistral: process.env.MISTRAL_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY, groq: process.env.GROQ_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY, pekpik: process.env.PEKPIK_API_KEY,
    xai: process.env.XAI_API_KEY, kimi: process.env.KIMI_API_KEY,
  };
  const active = Object.entries(keyMap).filter(([, v]) => v).map(([k]) => k);
  console.log(`\n🚀 OmniAgent Synergy OS — Backend port ${PORT}`);
  console.log(`✅ Keys configured (${active.length}): ${active.join(", ")}`);
  console.log(`♻️  Auto-fallback: 401/402/403/404/429/5xx → prefers Groq → Cerebras → pekpik`);
  console.log(`🌍 Language detection: active`);
  startKeyRotator();
});
