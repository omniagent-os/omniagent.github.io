import { PEKPIK_BASE_URL } from './providers';

  export type KeyStatus = 'idle' | 'checking' | 'ok' | 'error' | 'missing';

  export interface KeyCheckResult {
    providerId: string;
    status: KeyStatus;
    latencyMs?: number;
    error?: string;
  }

  const PEKPIK_PROVIDERS = new Set(['pekpik', 'xai', 'kimi']);

  // Minimal single-token test message to minimise cost
  const TEST_MESSAGES = [{ role: 'user' as const, content: 'Hi' }];
  const TEST_MODEL: Record<string, string> = {
    openai:    'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    google:    'gemini-1.5-flash',
    mistral:   'mistral-small-latest',
    deepseek:  'deepseek-chat',
    groq:      'llama-3.1-8b-instant',
    cerebras:  'llama3.1-8b',
    pekpik:    'smart-chat',
    xai:       'grok-4.20-beta',
    kimi:      'kimi-k2.5',
  };

  async function callWithTimeout(url: string, init: RequestInit, ms = 8000): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function checkOpenAICompat(endpoint: string, apiKey: string, model: string): Promise<KeyCheckResult & { providerId: string }> {
    const start = Date.now();
    const res = await callWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: TEST_MESSAGES, max_tokens: 1 }),
    });
    const latencyMs = Date.now() - start;
    if (res.ok || res.status === 400) return { providerId: '', status: 'ok', latencyMs }; // 400 = key ok but bad params fine
    const txt = await res.text().catch(() => '');
    return { providerId: '', status: 'error', latencyMs, error: `HTTP ${res.status}: ${txt.slice(0, 120)}` };
  }

  export async function validateKey(providerId: string, apiKey: string): Promise<KeyCheckResult> {
    if (!apiKey) return { providerId, status: 'missing' };

    try {
      if (PEKPIK_PROVIDERS.has(providerId)) {
        const r = await checkOpenAICompat(`${PEKPIK_BASE_URL}/chat/completions`, apiKey, TEST_MODEL[providerId] ?? 'smart-chat');
        return { ...r, providerId };
      }

      switch (providerId) {
        case 'openai':
          return { ...(await checkOpenAICompat('https://api.openai.com/v1/chat/completions', apiKey, TEST_MODEL.openai)), providerId };
        case 'mistral':
          return { ...(await checkOpenAICompat('https://api.mistral.ai/v1/chat/completions', apiKey, TEST_MODEL.mistral)), providerId };
        case 'deepseek':
          return { ...(await checkOpenAICompat('https://api.deepseek.com/chat/completions', apiKey, TEST_MODEL.deepseek)), providerId };
        case 'groq':
          return { ...(await checkOpenAICompat('https://api.groq.com/openai/v1/chat/completions', apiKey, TEST_MODEL.groq)), providerId };
        case 'cerebras':
          return { ...(await checkOpenAICompat('https://api.cerebras.ai/v1/chat/completions', apiKey, TEST_MODEL.cerebras)), providerId };
        case 'anthropic': {
          const start = Date.now();
          const res = await callWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: TEST_MODEL.anthropic, max_tokens: 1, messages: TEST_MESSAGES }),
          });
          const latencyMs = Date.now() - start;
          if (res.ok || res.status === 400) return { providerId, status: 'ok', latencyMs };
          const txt = await res.text().catch(() => '');
          return { providerId, status: 'error', latencyMs, error: `HTTP ${res.status}: ${txt.slice(0, 120)}` };
        }
        case 'google': {
          const start = Date.now();
          const res = await callWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL.google}:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] }) }
          );
          const latencyMs = Date.now() - start;
          if (res.ok) return { providerId, status: 'ok', latencyMs };
          const txt = await res.text().catch(() => '');
          return { providerId, status: 'error', latencyMs, error: `HTTP ${res.status}: ${txt.slice(0, 120)}` };
        }
        default:
          return { providerId, status: 'error', error: 'Unknown provider' };
      }
    } catch (e: unknown) {
      return { providerId, status: 'error', error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // ── FreeLLM fresh-key fetcher ─────────────────────────────────────────────────
  const README_URL = 'https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md';

  export interface FreeLLMKey {
    key: string;
    model: string;
    budget: string;
    expires: string;
    description: string;
  }

  export async function fetchFreeLLMKeys(): Promise<FreeLLMKey[]> {
    const res = await callWithTimeout(README_URL, {}, 10000);
    if (!res.ok) throw new Error(`Failed to fetch README: HTTP ${res.status}`);
    const text = await res.text();

    const keys: FreeLLMKey[] = [];
    // Parse markdown table rows: | `sk-xxx` | model | status | budget | rate | expires | desc |
    const rowRegex = /|s*`(sk-[A-Za-z0-9]+)`s*|s*([^|]+)|s*[^|]+|s*([^|]+)|s*[^|]+|s*([^|]+)|s*([^|]+)|/g;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(text)) !== null) {
      keys.push({
        key:         m[1].trim(),
        model:       m[2].trim(),
        budget:      m[3].trim(),
        expires:     m[4].trim(),
        description: m[5].trim(),
      });
    }
    return keys;
  }
  