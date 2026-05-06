import { type Provider } from './types';

  // Base URL for FreeLLM Hub (pekpik) — OpenAI-compatible, 90+ models
  // Keys expire every 24-48h → https://github.com/alistaitsacle/free-llm-api-keys
  export const PEKPIK_BASE_URL = 'https://aiapiv2.pekpik.com/v1';

  export const defaultProviders: Provider[] = [
    {
      id: 'openai',
      label: 'OpenAI',
      apiKey: '',
      model: 'gpt-4o',
      enabled: true,
      color: 'hsl(160 84% 39%)',
    },
    {
      id: 'anthropic',
      label: 'Anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      enabled: true,
      color: 'hsl(30 100% 60%)',
    },
    {
      id: 'google',
      label: 'Google',
      apiKey: '',
      model: 'gemini-2.0-flash',
      enabled: true,
      color: 'hsl(199 89% 48%)',
    },
    {
      id: 'mistral',
      label: 'Mistral',
      apiKey: '',
      model: 'mistral-large-latest',
      enabled: true,
      color: 'hsl(262 83% 58%)',
    },
    {
      id: 'deepseek',
      label: 'DeepSeek',
      apiKey: '',
      model: 'deepseek-chat',
      enabled: true,
      color: 'hsl(220 100% 60%)',
    },
    {
      id: 'groq',
      label: 'Groq',
      apiKey: '',
      model: 'llama-3.3-70b-versatile',
      enabled: true,
      color: 'hsl(330 81% 60%)',
    },
    {
      id: 'cerebras',
      label: 'Cerebras',
      apiKey: '',
      model: 'llama3.1-70b',
      enabled: true,
      color: 'hsl(45 96% 56%)',
    },
    // ── FreeLLM Hub (pekpik) — unified gateway to 90+ models ──────────
    {
      id: 'pekpik',
      label: 'FreeLLM Hub',
      apiKey: '',
      model: 'smart-chat',
      enabled: true,
      color: 'hsl(280 70% 60%)',
    },
    {
      id: 'xai',
      label: 'xAI Grok',
      apiKey: '',
      model: 'grok-4.20-beta',
      enabled: true,
      color: 'hsl(0 0% 80%)',
    },
    {
      id: 'kimi',
      label: 'Kimi',
      apiKey: '',
      model: 'kimi-k2.5',
      enabled: true,
      color: 'hsl(180 70% 45%)',
    },
  ];

  export const AVAILABLE_MODELS: Record<string, string[]> = {
    // Direct API providers
    openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    google:    ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    mistral:   ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    deepseek:  ['deepseek-chat', 'deepseek-reasoner'],
    groq:      ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    cerebras:  ['llama3.1-70b', 'llama3.1-8b', 'llama-4-scout-17b-16e-instruct'],

    // FreeLLM Hub (pekpik) — OpenAI-compatible endpoint
    pekpik:    [
      'smart-chat',          // auto-routes across healthy backends
      'gpt-5.5',
      'gpt-5.4',
      'gpt-5.4-mini',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
      'deepseek-chat',
      'deepseek-reasoner',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'mistral-medium',
      'codestral-latest',
      'devstral-latest',
      'GLM-4.7',
      'kimi-k2.5',
      'Mercury',
    ],
    xai:       ['grok-4.20-beta', 'grok-4.20-multi-agent-beta'],
    kimi:      ['kimi-k2.5'],
  };
  