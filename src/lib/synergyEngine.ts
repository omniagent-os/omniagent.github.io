import { type Provider, type ModelResponse, type Message } from './types';

// Backend proxy base URL — in dev Vite proxies /api → localhost:3001
const API_BASE = '/api';

const mockResponses: Record<string, string> = {
  openai: "Here's a comprehensive overview from my perspective. I've analysed the core components and structured them logically for better understanding.",
  anthropic: "I've thought deeply about this. Let's break this down from first principles, focusing on safety, alignment, and robust reasoning.",
  google: "Based on my vast knowledge graph, here are the factual details and interconnected concepts that relate to your query.",
  mistral: "Direct and efficient answer. Here are the key technical points without unnecessary fluff, optimised for performance.",
  deepseek: "Analysing the code and logical structures. Here is a precise, mathematically sound breakdown of the problem.",
  groq: "Fastest response generated. I've processed the context rapidly to provide immediate, actionable insights.",
};

const mockSynthesis =
  "By synthesising the diverse perspectives of multiple leading AI models, we arrive at a robust conclusion: The most effective approach combines structural logic, first-principles reasoning, and factual grounding. This synergy eliminates individual model biases and produces a mathematically sound, actionable insight that outperforms any single AI's response.";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ─── Backend status ───────────────────────────────────── */
export async function getBackendStatus(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return {};
    const data = await res.json();
    return (data.providers as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

/* ─── Main entry point ─────────────────────────────────── */
export async function processSynergy(
  message: string,
  providers: Provider[],
  history: Message[] = [],
  onProgress?: (partial: ModelResponse) => void
): Promise<{ modelResponses: ModelResponse[]; synthesis: string }> {
  // 1. Check which providers have keys on the backend
  const backendStatus = await getBackendStatus();
  const hasBackendKeys = Object.values(backendStatus).some(Boolean);

  // 2. Legacy: check localStorage keys (direct-call fallback)
  const hasLocalKeys = providers.some((p) => p.apiKey);

  const isDemoMode = !hasBackendKeys && !hasLocalKeys;

  if (isDemoMode) {
    return runDemoSynergy(providers, onProgress);
  }

  // 3. Only use providers that are enabled AND have a key (backend or local)
  const enabledProviders = providers.filter(
    (p) => p.enabled && (backendStatus[p.id] || !!p.apiKey)
  );

  if (enabledProviders.length === 0) {
    return runDemoSynergy(providers, onProgress);
  }

  const promises = enabledProviders.map(async (provider) => {
    const pStart = Date.now();
    try {
      if (onProgress) {
        onProgress({
          providerId: provider.id,
          model: provider.model,
          content: '',
          responseTimeMs: 0,
          tokensUsed: 0,
          status: 'streaming',
        });
      }

      const useBackend = !!backendStatus[provider.id];
      const response = await fetchFromProvider(provider, message, history, useBackend);

      const result: ModelResponse = {
        providerId: provider.id,
        model: provider.model,
        content: response,
        responseTimeMs: Date.now() - pStart,
        tokensUsed: Math.round(response.length / 4),
        status: 'done',
      };
      if (onProgress) onProgress(result);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${provider.id}] Error:`, msg);
      const errResult: ModelResponse = {
        providerId: provider.id,
        model: provider.model,
        content: '',
        responseTimeMs: Date.now() - pStart,
        tokensUsed: 0,
        status: 'error',
        error: msg,
      };
      if (onProgress) onProgress(errResult);
      return errResult;
    }
  });

  const modelResponses = await Promise.all(promises);

  // 4. Synthesis pass — use the first successful provider
  const successfulResponses = modelResponses.filter((r) => r.status === 'done');
  let synthesis = 'Synthesis unavailable — no successful model responses.';

  if (successfulResponses.length > 0) {
    const synthesisProvider =
      enabledProviders.find((p) => p.id === successfulResponses[0].providerId) ||
      enabledProviders[0];
    const useBackend = !!backendStatus[synthesisProvider.id];

    const synthesisPrompt = `You are the Synthesis Agent. Below are responses from various AI models to a user query.
Synthesise them into one superior, cohesive answer.
Do NOT mention model names or that you are synthesising. Just give the best possible answer.

User Query: ${message}

Responses:
${successfulResponses.map((r) => `--- ${r.providerId} ---\n${r.content}`).join('\n\n')}`;

    try {
      synthesis = await fetchFromProvider(synthesisProvider, synthesisPrompt, [], useBackend);
    } catch (e) {
      console.error('Synthesis failed:', e);
      synthesis = 'Synthesis failed. See individual model responses below.';
    }
  }

  return { modelResponses, synthesis };
}

/* ─── Demo mode ────────────────────────────────────────── */
async function runDemoSynergy(
  providers: Provider[],
  onProgress?: (partial: ModelResponse) => void
) {
  const enabledProviders = providers.filter((p) => p.enabled);

  const promises = enabledProviders.map(async (provider) => {
    const jitter = Math.random() * 2000 + 1000;
    if (onProgress) {
      onProgress({
        providerId: provider.id,
        model: provider.model,
        content: '',
        responseTimeMs: 0,
        tokensUsed: 0,
        status: 'streaming',
      });
    }
    await delay(jitter);
    const result: ModelResponse = {
      providerId: provider.id,
      model: provider.model,
      content: mockResponses[provider.id] ?? 'Demo response.',
      responseTimeMs: jitter,
      tokensUsed: 42,
      status: 'done',
    };
    if (onProgress) onProgress(result);
    return result;
  });

  const modelResponses = await Promise.all(promises);
  await delay(1200);
  return { modelResponses, synthesis: mockSynthesis };
}

/* ─── Direct provider calls (localStorage key fallback) ── */
async function fetchFromProvider(
  provider: Provider,
  message: string,
  history: Message[],
  useBackend: boolean
): Promise<string> {
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // ── Backend proxy path (preferred — avoids CORS, keeps keys secure) ──
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
    return data.content as string;
  }

  // ── Direct call (legacy — localStorage API key) ──
  switch (provider.id) {
    case 'openai':
    case 'mistral':
    case 'deepseek':
    case 'groq': {
      const endpoints: Record<string, string> = {
        openai:   'https://api.openai.com/v1/chat/completions',
        mistral:  'https://api.mistral.ai/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/chat/completions',
        groq:     'https://api.groq.com/openai/v1/chat/completions',
      };
      const res = await fetch(endpoints[provider.id], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ model: provider.model, messages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }
    case 'google': {
      const geminiMessages = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: geminiMessages }) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    }
    case 'anthropic':
      throw new Error('Anthropic requires the backend proxy due to CORS. Start the server and add your ANTHROPIC_API_KEY.');
    default:
      throw new Error(`Unsupported provider: ${provider.id}`);
  }
}
