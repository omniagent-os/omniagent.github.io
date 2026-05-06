import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

/* ─── Status ──────────────────────────────────────────── */
app.get("/api/status", (_req, res) => {
  res.json({
    providers: {
      openai:    !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google:    !!process.env.GOOGLE_API_KEY,
      mistral:   !!process.env.MISTRAL_API_KEY,
      deepseek:  !!process.env.DEEPSEEK_API_KEY,
      groq:      !!process.env.GROQ_API_KEY,
      cerebras:  !!process.env.CEREBRAS_API_KEY,
    },
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ─── Proxy ───────────────────────────────────────────── */
app.post("/api/proxy", async (req, res) => {
  const { providerId, model, messages } = req.body;
  if (!providerId || !model || !messages)
    return res.status(400).json({ error: "Missing providerId, model or messages" });

  try {
    let content;
    switch (providerId) {
      case "openai":
        content = await callOpenAICompat("https://api.openai.com/v1/chat/completions",       process.env.OPENAI_API_KEY,   "openai",   model, messages); break;
      case "mistral":
        content = await callOpenAICompat("https://api.mistral.ai/v1/chat/completions",       process.env.MISTRAL_API_KEY,  "mistral",  model, messages); break;
      case "deepseek":
        content = await callOpenAICompat("https://api.deepseek.com/chat/completions",        process.env.DEEPSEEK_API_KEY, "deepseek", model, messages); break;
      case "groq":
        content = await callOpenAICompat("https://api.groq.com/openai/v1/chat/completions",  process.env.GROQ_API_KEY,     "groq",     model, messages); break;
      case "cerebras":
        content = await callOpenAICompat("https://api.cerebras.ai/v1/chat/completions",      process.env.CEREBRAS_API_KEY, "cerebras", model, messages); break;
      case "anthropic":
        content = await callAnthropic(model, messages); break;
      case "google":
        content = await callGoogle(model, messages);    break;
      default:
        return res.status(400).json({ error: `Unsupported provider: ${providerId}` });
    }
    res.json({ content });
  } catch (err) {
    console.error(`[${providerId}] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Provider helpers ────────────────────────────────── */
async function callOpenAICompat(endpoint, apiKey, name, model, messages) {
  if (!apiKey) throw new Error(`${name} API key not configured. Add it to server/.env`);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(model, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured. Add it to server/.env");
  const system = messages.find((m) => m.role === "system");
  const chat   = messages.filter((m) => m.role !== "system");
  const body   = { model, max_tokens: 4096, messages: chat };
  if (system) body.system = system.content;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const txt = await res.text().catch(() => ""); throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`); }
  const data = await res.json();
  return data.content[0].text;
}

async function callGoogle(model, messages) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Google API key not configured. Add it to server/.env");
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents }) }
  );
  if (!res.ok) { const txt = await res.text().catch(() => ""); throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`); }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

/* ─── Start ───────────────────────────────────────────── */
app.listen(PORT, () => {
  const map = {
    openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY, mistral: process.env.MISTRAL_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY, groq: process.env.GROQ_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
  };
  const active = Object.entries(map).filter(([,v]) => v).map(([k]) => k);
  console.log(`\n🚀 OmniAgent Backend — port ${PORT}`);
  console.log(`✅ Active providers: ${active.length ? active.join(", ") : "none (demo mode)"}`);
  if (!active.length) console.log("👉  Edit server/.env and add your API keys\n");
});
