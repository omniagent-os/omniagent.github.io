import { type Provider, type ModelResponse, type Message } from './types';
  import { PEKPIK_BASE_URL } from './providers';

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
    "By synthesising diverse perspectives from multiple leading AI models, we arrive at a robust conclusion: the most effective approach combines structural logic, first-principles reasoning, and factual grounding — eliminating individual model biases for a superior unified answer.";

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Providers routed through FreeLLM Hub (pekpik) — OpenAI-compatible
  const PEKPIK_PROVIDERS = new Set(['pekpik', 'xai', 'kimi']);

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
          onProgress({ providerId: provider.id, model: provider.model, content: '', responseTimeMs: 0, tokensUsed: 0, status: 'streaming' });
        }
        const useBackend = !!backendStatus[provider.id];
        const response   = await fetchFromProvider(provider, message, history, useBackend);
        const result: ModelResponse = {
          providerId: provider.id, model: provider.model,
          content: response, responseTimeMs: Date.now() - pStart,
          tokensUsed: Math.round(response.length / 4), status: 'done',
        };
        if (onProgress) onProgress(result);
        return result;
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
      const synthesisProvider =
        enabledProviders.find((p) => p.id === successfulResponses[0].providerId) || enabledProviders[0];
      const useBackend = !!backendStatus[synthesisProvider.id];
      const synthesisPrompt = `You are the Synthesis Agent. Below are responses from various AI models to a user query.
  Synthesise them into one superior, cohesive answer.
  Do NOT mention model names or that you are synthesising. Just give the best possible answer.

  User Query: ${message}

  Responses:
  ${successfulResponses.map((r) => `--- ${r.providerId} ---\n${r.content}`).join('\n\n')}`;
      try {
        synthesis = await fetchFromProvider(synthesisProvider, synthesisPrompt, [], useBackend);
      } catch {
        synthesis = 'Synthesis failed. See individual model responses below.';
      }
    }

    return { modelResponses, synthesis };
  }

  /* ─── Demo mode ────────────────────────────────────────── */
  async function runDemoSynergy(providers: Provider[], onProgress?: (partial: ModelResponse) => void) {
    const enabledProviders = providers.filter((p) => p.enabled);
    const promises = enabledProviders.map(async (provider) => {
      const jitter = Math.random() * 2000 + 800;
      if (onProgress) {
        onProgress({ providerId: provider.id, model: provider.model, content: '', responseTimeMs: 0, tokensUsed: 0, status: 'streaming' });
      }
      await delay(jitter);
      const result: ModelResponse = {
        providerId: provider.id, model: provider.model,
        content: mockResponses[provider.id] ?? 'Demo response.',
        responseTimeMs: jitter, tokensUsed: 42, status: 'done',
      };
      if (onProgress) onProgress(result);
      return result;
    });
    const modelResponses = await Promise.all(promises);
    await delay(1200);
    return { modelResponses, synthesis: mockSynthesis };
  }

  /* ─── Provider calls ───────────────────────────────────── */
  async function fetchFromProvider(
    provider: Provider, message: string, history: Message[], useBackend: boolean
  ): Promise<string> {
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

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

    // ── Direct API calls (no backend) ─────────────────────

    // FreeLLM Hub (pekpik) — handles pekpik, xai, kimi via OpenAI-compatible API
    if (PEKPIK_PROVIDERS.has(provider.id)) {
      if (!provider.apiKey) throw new Error(`FreeLLM Hub key required for ${provider.id}. Add it in Settings or start the backend.`);
      const res = await fetch(`${PEKPIK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ model: provider.model, messages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }

    switch (provider.id) {
      case 'openai':
      case 'mistral':
      case 'deepseek':
      case 'groq':
      case 'cerebras': {
        const endpoints: Record<string, string> = {
          openai:   'https://api.openai.com/v1/chat/completions',
          mistral:  'https://api.mistral.ai/v1/chat/completions',
          deepseek: 'https://api.deepseek.com/chat/completions',
          groq:     'https://api.groq.com/openai/v1/chat/completions',
          cerebras: 'https://api.cerebras.ai/v1/chat/completions',
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
        throw new Error('Anthropic requires the backend proxy (CORS). Start the server and add ANTHROPIC_API_KEY to server/.env');
      default:
        throw new Error(`Unsupported provider: ${provider.id}`);
    }
  }
  