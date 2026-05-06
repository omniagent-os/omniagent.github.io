import { type Provider, type ModelResponse, type Message } from './types';
import { PEKPIK_BASE_URL } from './providers';
import { type DetectedLanguage, DEFAULT_LANGUAGE } from './languageDetector';

const API_BASE = '/api';

const mockResponses: Record<string, string> = {
  openai:    "Here's a comprehensive overview. I've analysed the core components and structured them logically for better understanding.",
  anthropic: "Let's break this down from first principles, focusing on safety, alignment, and robust reasoning.",
  google:    "Based on my knowledge graph, here are the factual details and interconnected concepts related to your query.",
  mistral:   "Direct and efficient answer. Here are the key technical points, optimised for performance.",
  deepseek:  "Analysing the logical structures. Here is a precise, mathematically sound breakdown of the problem.",
  groq:      "Fastest response generated. Immediate, actionable insights processed at high speed.",
  cerebras:  "Ultra-fast inference complete. Here is a high-throughput, low-latency synthesis of the key points.",
  pekpik:    "Unified multi-model synthesis via FreeLLM Hub. Routing across GPT-5.5, Claude, DeepSeek and Gemini backends for the most reliable answer.",
  xai:       "Grok perspective acquired. Cutting-edge reasoning with real-time knowledge and unfiltered analysis.",
  kimi:      "Long-context analysis complete. Kimi's extended context window delivers deep, thorough comprehension.",
};

const mockSynthesis =
  "By synthesising diverse perspectives from multiple leading AI models — including GPT, Claude, Gemini, DeepSeek, Grok, and Kimi — we arrive at a robust conclusion: the most effective approach combines structural logic, first-principles reasoning, real-time data awareness, and factual grounding. This eliminates individual model biases for a superior, unified answer.";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PEKPIK_PROVIDERS = new Set(['pekpik', 'xai', 'kimi']);

/* ─── Result type for provider calls ───────────────────── */
interface CallResult {
  content: string;
  usedModel: string;
  usedProvider: string;
  fallbackUsed: boolean;
  originalModel?: string;
  originalProvider?: string;
}

/* ─── Backend status ───────────────────────────────────── */
export async function getBackendStatus(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return {};
    const data = await res.json();
    return (data.providers as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

/* ─── Language system message ──────────────────────────── */
function buildSystemMessage(lang: DetectedLanguage): { role: 'system'; content: string } {
  return { role: 'system', content: lang.systemInstruction };
}

/* ─── Main entry point ─────────────────────────────────── */
export async function processSynergy(
  message: string,
  providers: Provider[],
  history: Message[] = [],
  onProgress?: (partial: ModelResponse) => void,
  detectedLanguage: DetectedLanguage = DEFAULT_LANGUAGE,
): Promise<{ modelResponses: ModelResponse[]; synthesis: string }> {

  const backendStatus = await getBackendStatus();
  const hasBackendKeys = Object.values(backendStatus).some(Boolean);
  const hasLocalKeys   = providers.some((p) => p.apiKey);
  const isDemoMode     = !hasBackendKeys && !hasLocalKeys;

  if (isDemoMode) return runDemoSynergy(providers, onProgress);

  const enabledProviders = providers.filter(
    (p) => p.enabled && (backendStatus[p.id] || !!p.apiKey)
  );
  if (enabledProviders.length === 0) return runDemoSynergy(providers, onProgress);

  const promises = enabledProviders.map(async (provider) => {
    const pStart = Date.now();
    try {
      if (onProgress) {
        onProgress({
          providerId: provider.id, model: provider.model,
          content: '', responseTimeMs: 0, tokensUsed: 0, status: 'streaming',
        });
      }
      const useBackend = !!backendStatus[provider.id];
      const result = await fetchFromProvider(provider, message, history, useBackend, detectedLanguage);
      const modelResult: ModelResponse = {
        providerId: provider.id,
        model: result.usedModel,
        content: result.content,
        responseTimeMs: Date.now() - pStart,
        tokensUsed: Math.round(result.content.length / 4),
        status: 'done',
        fallbackUsed: result.fallbackUsed,
        usedModel: result.usedModel,
        usedProvider: result.usedProvider,
        originalModel: result.originalModel,
        originalProvider: result.originalProvider,
      };
      if (onProgress) onProgress(modelResult);
      return modelResult;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${provider.id}] Error:`, msg);
      const errResult: ModelResponse = {
        providerId: provider.id, model: provider.model, content: '',
        responseTimeMs: Date.now() - pStart, tokensUsed: 0, status: 'error', error: msg,
      };
      if (onProgress) onProgress(errResult);
      return errResult;
    }
  });

  const modelResponses = await Promise.all(promises);
  const successfulResponses = modelResponses.filter((r) => r.status === 'done');
  let synthesis = 'Synthesis unavailable — no successful model responses.';

  if (successfulResponses.length > 0) {
    const preferredOrder = ['pekpik', 'openai', 'anthropic', 'google', 'deepseek', 'groq', 'cerebras', 'mistral', 'xai', 'kimi'];
    const synthesisProviderId =
      preferredOrder.find((id) => successfulResponses.some((r) => r.providerId === id)) ??
      successfulResponses[0].providerId;
    const synthesisProvider =
      enabledProviders.find((p) => p.id === synthesisProviderId) ?? enabledProviders[0];
    const useBackend = !!backendStatus[synthesisProvider.id];

    const langInstruction = detectedLanguage.code !== 'en'
      ? `\n\nCRITICAL: Your synthesis MUST be written entirely in ${detectedLanguage.name} (${detectedLanguage.nativeName}). Do not use English or any other language.`
      : '';

    const synthesisPrompt =
`You are the Synthesis Agent. Below are responses from multiple AI models to a user query.
Synthesise them into ONE superior, cohesive answer that captures the best insights from each.
Do NOT mention model names, that you are an AI, or that you are synthesising. Just give the best possible answer.${langInstruction}

User Query: ${message}

Model Responses:
${successfulResponses.map((r) => `--- ${r.usedProvider ?? r.providerId} / ${r.model} ---\n${r.content}`).join('\n\n')}`;

    try {
      const synthResult = await fetchFromProvider(
        synthesisProvider, synthesisPrompt, [], useBackend, detectedLanguage
      );
      synthesis = synthResult.content;
    } catch {
      synthesis = successfulResponses.length === 1
        ? successfulResponses[0].content
        : 'Synthesis failed. See individual model responses below.';
    }
  }

  return { modelResponses, synthesis };
}

/* ─── Demo mode ────────────────────────────────────────── */
async function runDemoSynergy(
  providers: Provider[],
  onProgress?: (partial: ModelResponse) => void,
) {
  const enabledProviders = providers.filter((p) => p.enabled);
  const promises = enabledProviders.map(async (provider) => {
    const jitter = Math.random() * 2000 + 800;
    if (onProgress) {
      onProgress({
        providerId: provider.id, model: provider.model,
        content: '', responseTimeMs: 0, tokensUsed: 0, status: 'streaming',
      });
    }
    await delay(jitter);
    const result: ModelResponse = {
      providerId: provider.id, model: provider.model,
      content: mockResponses[provider.id] ?? `[Demo] Simulated response from ${provider.id}.`,
      responseTimeMs: jitter, tokensUsed: 42, status: 'done',
    };
    if (onProgress) onProgress(result);
    return result;
  });
  const modelResponses = await Promise.all(promises);
  await delay(1200);
  return { modelResponses, synthesis: mockSynthesis };
}

/* ─── Provider API calls ───────────────────────────────── */
async function fetchFromProvider(
  provider: Provider,
  message: string,
  history: Message[],
  useBackend: boolean,
  lang: DetectedLanguage = DEFAULT_LANGUAGE,
): Promise<CallResult> {
  const systemMsg = buildSystemMessage(lang);

  const messages: { role: string; content: string }[] = [
    systemMsg,
    ...history
      .filter((h) => h.role !== 'system')
      .map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // ── Backend proxy (with server-side automatic fallback) ──
  if (useBackend) {
    const res = await fetch(`${API_BASE}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: provider.id, model: provider.model, messages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      content: data.content as string,
      usedModel: (data.usedModel ?? provider.model) as string,
      usedProvider: (data.usedProvider ?? provider.id) as string,
      fallbackUsed: !!(data.fallbackUsed),
      originalModel: data.originalModel as string | undefined,
      originalProvider: data.originalProvider as string | undefined,
    };
  }

  // ── Direct call (no backend — uses localStorage key) ─────

  if (PEKPIK_PROVIDERS.has(provider.id)) {
    if (!provider.apiKey)
      throw new Error(`FreeLLM Hub key required for ${provider.id}. Add it in Settings or start the backend.`);
    const res = await fetch(`${PEKPIK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: provider.model, messages }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      content: data.choices[0].message.content,
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  const directEndpoints: Record<string, string> = {
    openai:   'https://api.openai.com/v1/chat/completions',
    mistral:  'https://api.mistral.ai/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    groq:     'https://api.groq.com/openai/v1/chat/completions',
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  };

  if (directEndpoints[provider.id]) {
    const res = await fetch(directEndpoints[provider.id], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: provider.model, messages }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      content: data.choices[0].message.content,
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  if (provider.id === 'google') {
    const geminiContents: { role: string; parts: { text: string }[] }[] = [
      { role: 'user',  parts: [{ text: systemMsg.content }] },
      { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
      ...history
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: geminiContents }) }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Google HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  if (provider.id === 'anthropic') {
    throw new Error('Anthropic requires the backend proxy (CORS). Start the backend server and add ANTHROPIC_API_KEY to server/.env');
  }

  throw new Error(`Unsupported provider: ${provider.id}`);
}
