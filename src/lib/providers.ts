import { type Provider } from './types';

// FreeLLM Hub — OpenAI-compatible gateway to 90+ models
// Keys rotate every 24-48h → https://github.com/alistaitsacle/free-llm-api-keys
export const PEKPIK_BASE_URL = 'https://aiapiv2.pekpik.com/v1';

export const defaultProviders: Provider[] = [
  // ── Direct API providers ────────────────────────────────
  {
    id: 'openai',
    label: 'OpenAI',
    apiKey: '',
    model: 'gpt-4o',
    enabled: false,
    color: 'hsl(160 84% 39%)',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    enabled: false,
    color: 'hsl(30 100% 60%)',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    enabled: false,
    color: 'hsl(199 89% 48%)',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    apiKey: '',
    model: 'mistral-large-latest',
    enabled: false,
    color: 'hsl(262 83% 58%)',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiKey: '',
    model: 'deepseek-chat',
    enabled: false,
    color: 'hsl(220 100% 60%)',
  },
  {
    id: 'groq',
    label: 'Groq',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    enabled: false,
    color: 'hsl(330 81% 60%)',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    apiKey: '',
    model: 'llama3.3-70b',
    enabled: false,
    color: 'hsl(45 96% 56%)',
  },

  // ── FreeLLM Hub (pekpik) — unified gateway ─────────────
  {
    id: 'pekpik',
    label: 'FreeLLM Hub',
    apiKey: 'sk-Joxb0YyCPuxLj7SBFqirPT1MQyKl8yLibJBhDP7Br9FPa3nK',
    model: 'smart-chat',
    enabled: true,
    color: 'hsl(280 70% 60%)',
  },
  {
    id: 'xai',
    label: 'xAI Grok',
    apiKey: '',
    model: 'grok-4.20-beta',
    enabled: false,
    color: 'hsl(0 0% 80%)',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    apiKey: '',
    model: 'kimi-k2.5',
    enabled: false,
    color: 'hsl(180 70% 45%)',
  },
];

export const AVAILABLE_MODELS: Record<string, string[]> = {
  // Direct API providers
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  google: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
  ],
  mistral: [
    'mistral-large-latest',
    'mistral-medium-latest',
    'mistral-small-latest',
    'codestral-latest',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ],
  cerebras: [
    'llama3.1-70b',
    'llama3.1-8b',
    'llama-4-scout-17b-16e-instruct',
  ],

  // FreeLLM Hub (pekpik) — OpenAI-compatible, 90+ models
  pekpik: [
    'smart-chat',           // auto-routes across healthy backends
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5',
    'deepseek-chat',
    'deepseek-reasoner',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.1-flash-lite',
    'mistral-medium',
    'codestral-latest',
    'devstral-latest',
    'GLM-4.7',
    'kimi-k2.5',
    'Mercury',
    'command-a-vision-07-2025',
    'command-a-reasoning-08-2025',
  ],
  xai: [
    'grok-4.20-beta',
    'grok-4.20-multi-agent-beta',
  ],
  kimi: [
    'kimi-k2.5',
  ],
};
