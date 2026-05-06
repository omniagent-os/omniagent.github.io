import { type Provider, type ModelResponse, type Message } from './types';
import { PEKPIK_BASE_URL } from './providers';
import { type DetectedLanguage, DEFAULT_LANGUAGE } from './languageDetector';

const mockResponses: Record<string, string> = {
  openai: "Here's a comprehensive overview. I've analysed the core components and structured them logically for better understanding.",
  anthropic: "Let's break this down from first principles, focusing on safety, alignment, and robust reasoning.",
  google: "Based on my knowledge graph, here are the factual details and interconnected concepts related to your query.",
  mistral: "Direct and efficient answer. Here are the key technical points, optimised for performance.",
  deepseek: "Analysing the logical structures. Here is a precise, mathematically sound breakdown of the problem.",
  groq: "Fastest response generated. Immediate, actionable insights processed at high speed.",
  cerebras: "Ultra-fast inference complete. Here is a high-throughput, low-latency synthesis of the key points.",
  pekpik: "Unified multi-model synthesis via FreeLLM Hub. Routing across GPT-5.5, Claude, DeepSeek and Gemini backends for the most reliable answer.",
  xai: "Grok perspective acquired. Cutting-edge reasoning with real-time knowledge and unfiltered analysis.",
  kimi: "Long-context analysis complete. Kimi's extended context window delivers deep, thorough comprehension.",
};

const mockSynthesis =
  'Demo mode - no reachable backend and no local API keys were found. Add keys in API Keys, or connect a backend in Settings.';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PEKPIK_PROVIDERS = new Set(['pekpik', 'xai', 'kimi']);
const HEALTH_TTL = 20_000;

interface CallResult {
  content: string;
  usedModel: string;
  usedProvider: string;
  fallbackUsed: boolean;
  originalModel?: string;
  originalProvider?: string;
}

export interface SynergyOptions {
  synthesisProviderId?: string;
  backendUrl?: string;
}

let healthCache: { alive: boolean; at: number; apiBase: string | null; key: string } | null = null;

function normalizeBackendUrl(value?: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/g, '').replace(/\/api$/i, '');
}

function getBackendCandidates(configuredBackendUrl?: string): string[] {
  const configured = normalizeBackendUrl(configuredBackendUrl);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocalOrigin = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(currentOrigin);
  const candidates: string[] = [];

  if (configured) {
    candidates.push(`${configured}/api`);
  }

  if (import.meta.env.DEV || isLocalOrigin) {
    candidates.push('/api');
  }

  if (!isLocalOrigin) {
    candidates.push('http://127.0.0.1:3001/api', 'http://localhost:3001/api');
  }

  return [...new Set(candidates)];
}

async function resolveBackendApiBase(configuredBackendUrl?: string): Promise<string | null> {
  const now = Date.now();
  const cacheKey = normalizeBackendUrl(configuredBackendUrl);
  if (healthCache && healthCache.key === cacheKey && now - healthCache.at < HEALTH_TTL) {
    return healthCache.apiBase;
  }

  for (const candidate of getBackendCandidates(configuredBackendUrl)) {
    try {
      const res = await fetch(`${candidate}/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        healthCache = { alive: true, at: now, apiBase: candidate, key: cacheKey };
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  healthCache = { alive: false, at: now, apiBase: null, key: cacheKey };
  return null;
}

export async function getBackendHealth(configuredBackendUrl?: string): Promise<{ alive: boolean; apiBase: string | null }> {
  const apiBase = await resolveBackendApiBase(configuredBackendUrl);
  return { alive: !!apiBase, apiBase };
}

export async function getBackendStatus(configuredBackendUrl?: string): Promise<Record<string, boolean>> {
  const apiBase = await resolveBackendApiBase(configuredBackendUrl);
  if (!apiBase) return {};

  try {
    const res = await fetch(`${apiBase}/status`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return {};
    const data = await res.json();
    return (data.providers as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

function buildSystemMessage(lang: DetectedLanguage) {
  return { role: 'system' as const, content: lang.systemInstruction };
}

export async function processSynergy(
  message: string,
  providers: Provider[],
  history: Message[] = [],
  onProgress?: (partial: ModelResponse) => void,
  detectedLanguage: DetectedLanguage = DEFAULT_LANGUAGE,
  options: SynergyOptions = {},
): Promise<{ modelResponses: ModelResponse[]; synthesis: string }> {
  const apiBase = await resolveBackendApiBase(options.backendUrl);
  const backendAlive = !!apiBase;
  const hasLocalKeys = providers.some((p) => p.apiKey.trim());

  if (!backendAlive && !hasLocalKeys) {
    console.warn('[SynergyEngine] Backend unreachable and no local keys - demo mode');
    return runDemoSynergy(providers, onProgress);
  }

  const enabledProviders = providers.filter((p) => {
    if (!p.enabled) return false;
    if (backendAlive) return true;
    return !!p.apiKey.trim();
  });

  if (enabledProviders.length === 0) {
    return runDemoSynergy(providers, onProgress);
  }

  const modelResponses = await Promise.all(enabledProviders.map(async (provider) => {
    const startedAt = Date.now();
    try {
      onProgress?.({
        providerId: provider.id,
        model: provider.model,
        content: '',
        responseTimeMs: 0,
        tokensUsed: 0,
        status: 'streaming',
      });

      const result = await fetchFromProvider(provider, message, history, apiBase, detectedLanguage);
      const modelResult: ModelResponse = {
        providerId: provider.id,
        model: result.usedModel,
        content: result.content,
        responseTimeMs: Date.now() - startedAt,
        tokensUsed: Math.round(result.content.length / 4),
        status: 'done',
        fallbackUsed: result.fallbackUsed,
        usedModel: result.usedModel,
        usedProvider: result.usedProvider,
        originalModel: result.originalModel,
        originalProvider: result.originalProvider,
      };
      onProgress?.(modelResult);
      return modelResult;
    } catch (error: unknown) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      const errorResult: ModelResponse = {
        providerId: provider.id,
        model: provider.model,
        content: '',
        responseTimeMs: Date.now() - startedAt,
        tokensUsed: 0,
        status: 'error',
        error: messageText,
      };
      onProgress?.(errorResult);
      return errorResult;
    }
  }));

  const successfulResponses = modelResponses.filter((response) => response.status === 'done');
  if (successfulResponses.length === 0) {
    const attemptedProviders = enabledProviders.map((provider) => provider.label).join(', ');
    return {
      modelResponses,
      synthesis: attemptedProviders
        ? `No enabled provider returned a response. Checked: ${attemptedProviders}. Verify the active API key and keep only providers with a working key enabled.`
        : 'No enabled provider returned a response. Verify the active API key and keep only providers with a working key enabled.',
    };
  }

  const userPreferred = options.synthesisProviderId;
  const preferredOrder = ['groq', 'cerebras', 'pekpik', 'openai', 'anthropic', 'google', 'deepseek', 'mistral', 'xai', 'kimi'];
  const findById = (id: string) =>
    successfulResponses.find((response) => response.usedProvider === id || response.providerId === id);

  const synthesisProviderId =
    userPreferred && findById(userPreferred)
      ? userPreferred
      : preferredOrder.find((id) => findById(id)) ?? successfulResponses[0].providerId;

  const synthesisProvider =
    enabledProviders.find((provider) => provider.id === synthesisProviderId) ?? enabledProviders[0];

  const langInstruction = detectedLanguage.code !== 'en'
    ? `\n\nCRITICAL: Your synthesis MUST be written entirely in ${detectedLanguage.name} (${detectedLanguage.nativeName}). Do not use English or any other language.`
    : '';

  const synthesisPrompt = `You are the Synthesis Agent. Below are responses from multiple AI models to a user query.
Synthesise them into ONE superior, cohesive answer that captures the best insights from each.
Do NOT mention model names, that you are an AI, or that you are synthesising. Just give the best possible answer.${langInstruction}

User Query: ${message}

Model Responses:
${successfulResponses.map((response) => `--- ${response.usedProvider ?? response.providerId} / ${response.model} ---\n${response.content}`).join('\n\n')}`;

  let synthesis: string;
  try {
    const synthResult = await fetchFromProvider(synthesisProvider, synthesisPrompt, [], apiBase, detectedLanguage);
    synthesis = synthResult.content;
  } catch {
    synthesis = successfulResponses.length === 1
      ? successfulResponses[0].content
      : successfulResponses.map((response) => response.content).join('\n\n---\n\n');
  }

  return { modelResponses, synthesis };
}

async function runDemoSynergy(
  providers: Provider[],
  onProgress?: (partial: ModelResponse) => void,
) {
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const modelResponses = await Promise.all(enabledProviders.map(async (provider) => {
    const jitter = Math.random() * 1500 + 500;
    onProgress?.({
      providerId: provider.id,
      model: provider.model,
      content: '',
      responseTimeMs: 0,
      tokensUsed: 0,
      status: 'streaming',
    });
    await delay(jitter);
    const result: ModelResponse = {
      providerId: provider.id,
      model: provider.model,
      content: mockResponses[provider.id] ?? `[Demo] Simulated response from ${provider.id}.`,
      responseTimeMs: jitter,
      tokensUsed: 42,
      status: 'done',
    };
    onProgress?.(result);
    return result;
  }));

  await delay(800);
  return { modelResponses, synthesis: mockSynthesis };
}

async function fetchFromProvider(
  provider: Provider,
  message: string,
  history: Message[],
  apiBase: string | null,
  lang: DetectedLanguage = DEFAULT_LANGUAGE,
): Promise<CallResult> {
  const systemMsg = buildSystemMessage(lang);
  const messages: { role: string; content: string }[] = [
    systemMsg,
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message },
  ];

  if (apiBase) {
    const res = await fetch(`${apiBase}/proxy`, {
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
      fallbackUsed: !!data.fallbackUsed,
      originalModel: data.originalModel as string | undefined,
      originalProvider: data.originalProvider as string | undefined,
    };
  }

  if (PEKPIK_PROVIDERS.has(provider.id)) {
    if (!provider.apiKey.trim()) throw new Error(`No local key for ${provider.id}. Start the backend.`);
    const res = await fetch(`${PEKPIK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: provider.model, messages }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  const directEndpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  };

  if (directEndpoints[provider.id]) {
    if (!provider.apiKey.trim()) throw new Error(`No local key for ${provider.id}. Start the backend.`);
    const res = await fetch(directEndpoints[provider.id], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ model: provider.model, messages }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  if (provider.id === 'google') {
    if (!provider.apiKey.trim()) throw new Error('No local key for google. Start the backend.');
    const geminiContents = [
      { role: 'user', parts: [{ text: systemMsg.content }] },
      { role: 'model', parts: [{ text: 'Understood.' }] },
      ...history.map((item) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents }),
      },
    );
    if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      usedModel: provider.model,
      usedProvider: provider.id,
      fallbackUsed: false,
    };
  }

  throw new Error(`Provider ${provider.id} requires the backend proxy.`);
}
