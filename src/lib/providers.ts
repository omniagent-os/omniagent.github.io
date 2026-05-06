import { type Provider } from './types';

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
];

export const AVAILABLE_MODELS: Record<string, string[]> = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google:    ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  mistral:   ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  deepseek:  ['deepseek-chat', 'deepseek-reasoner'],
  groq:      ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
};
