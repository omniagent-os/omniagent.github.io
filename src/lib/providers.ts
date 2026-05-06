import { type Provider } from './types';

export const defaultProviders: Provider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    apiKey: '',
    model: 'gpt-4o',
    enabled: true,
    color: 'hsl(160 84% 39%)', // Green
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    apiKey: '',
    model: 'claude-3-5-sonnet-20240620',
    enabled: true,
    color: 'hsl(30 100% 60%)', // Orange
  },
  {
    id: 'google',
    label: 'Google',
    apiKey: '',
    model: 'gemini-1.5-pro',
    enabled: true,
    color: 'hsl(199 89% 48%)', // Blue
  },
  {
    id: 'mistral',
    label: 'Mistral',
    apiKey: '',
    model: 'mistral-large-latest',
    enabled: true,
    color: 'hsl(262 83% 58%)', // Purple
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiKey: '',
    model: 'deepseek-chat',
    enabled: true,
    color: 'hsl(220 100% 60%)', // Indigo
  },
  {
    id: 'groq',
    label: 'Groq',
    apiKey: '',
    model: 'llama-3.1-70b-versatile',
    enabled: false,
    color: 'hsl(330 81% 60%)', // Pink
  }
];

export const AVAILABLE_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
};
