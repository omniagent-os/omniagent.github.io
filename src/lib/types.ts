export type Provider = {
  id: string; // 'openai' | 'anthropic' | 'google' | 'mistral' | 'deepseek' | 'groq'
  label: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  color: string;
};

export type ModelResponse = {
  providerId: string;
  model: string;
  content: string;
  responseTimeMs: number;
  tokensUsed: number;
  status: 'pending' | 'streaming' | 'done' | 'error';
  error?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string; // synthesized response for assistant
  modelResponses?: ModelResponse[];
  timestamp: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelsUsed: string[];
};

export type SynergyMode = 'speed' | 'quality' | 'balanced';

export type AppSettings = {
  providers: Provider[];
  synergyMode: SynergyMode;
  theme: 'dark' | 'light';
  synthesisProvider: string;
};
